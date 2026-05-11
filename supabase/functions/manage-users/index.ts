import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle DELETE
    if (req.method === 'DELETE') {
      const { profileId, authUserId } = await req.json()
      if (authUserId) {
        await supabase.auth.admin.deleteUser(authUserId)
      }
      if (profileId) {
        await supabase.from("profiles").delete().eq("id", profileId)
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { email, password, fullName, phone, role, extraData } = body

    if (!email || !password || !fullName || !role) {
      return new Response(JSON.stringify({ error: "email, password, fullName and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      console.error("Auth create error:", authError)
      return new Response(JSON.stringify({ error: authError?.message || "Failed to create auth user" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authUserId = authData.user.id

    // 2. Create profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        auth_user_id: authUserId,
        full_name: fullName,
        email,
        phone: phone || null,
      })
      .select()
      .single()

    if (profileError || !profile) {
      console.error("Profile create error:", profileError)
      await supabase.auth.admin.deleteUser(authUserId)
      return new Response(JSON.stringify({ error: profileError?.message || "Failed to create profile" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Assign role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ profile_id: profile.id, role })

    if (roleError) {
      console.error("Role insert error:", roleError)
      await supabase.auth.admin.deleteUser(authUserId)
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Role-specific record
    if (role === "student" && extraData?.admissionNo) {
      const { error: e } = await supabase.from("students").insert({
        profile_id: profile.id,
        admission_no: extraData.admissionNo,
        date_of_birth: extraData.dateOfBirth || null,
      })
      if (e) return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (role === "teacher" && extraData?.employeeId) {
      const { error: e } = await supabase.from("teachers").insert({
        profile_id: profile.id,
        employee_id: extraData.employeeId,
        department: extraData.department || null,
      })
      if (e) return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true, profileId: profile.id, authUserId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("Function exception:", msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
