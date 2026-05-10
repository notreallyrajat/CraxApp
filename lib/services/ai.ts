import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY || "",
  baseURL: "https://api.groq.com/openai/v1",
  dangerouslyAllowBrowser: true
});

export async function generateTimetable(data: {
  teachers: any[];
  classes: any[];
  subjects: any[];
  assignments: any[];
  config: {
    daysPerWeek: number;
    periodsPerDay: number;
  }
}) {
  const prompt = `
    You are a professional school academic coordinator. Your task is to generate a weekly timetable JSON.
    
    DATA:
    - Days: ${data.config.daysPerWeek} (1=Mon, 2=Tue, etc.)
    - Periods per day: ${data.config.periodsPerDay}
    - Classes: ${JSON.stringify(data.classes.map(c => ({ id: c.id, name: c.name })))}
    - Teachers: ${JSON.stringify(data.teachers.map(t => ({ id: t.id, name: t.profiles?.full_name })))}
    - Subject Assignments: ${JSON.stringify(data.assignments.map(a => ({ 
        class_id: a.class_id, 
        teacher_id: a.teacher_id, 
        subject_id: a.subject_id,
        subject_name: a.subjects?.name
      })))}

    CONSTRAINTS:
    1. STRICT ASSIGNMENT: ONLY assign a teacher to a class if they are in the "Subject Assignments" list for that specific class_id.
    2. NO DOUBLE BOOKING: A teacher CANNOT be in two different classes in the same period on the same day.
    3. ONE SUBJECT PER SLOT: A class CANNOT have two different subjects in the same period.
    4. EVEN DISTRIBUTION: Ensure subjects assigned to a class are distributed evenly across the week.
    5. FREE PERIODS: If there aren't enough teachers to fill all periods while following constraints, mark the slot as "is_free_period: true".
    
    OUTPUT FORMAT:
    Return ONLY a JSON object with a key "timetable" containing an array:
    {
      "timetable": [
        {
          "class_id": "...",
          "day_of_week": 1,
          "period_number": 1,
          "subject_id": "...",
          "teacher_id": "...",
          "is_free_period": false
        }
      ]
    }
    No text before or after the JSON.
  `;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      messages: [
        { role: "system", content: "You are a professional school scheduler. You always output valid JSON representing the weekly timetable." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const text = response.choices[0].message.content || "{}";
    const result = JSON.parse(text);
    
    return result.timetable || result;
  } catch (error) {
    console.error("Groq Error:", error);
    throw error;
  }
}
