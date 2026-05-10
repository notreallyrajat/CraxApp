import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');

export default function StudentDeepAnalytics() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  const calculateDeepStats = (results: any[]) => {
    if (!results || results.length === 0) return null;

    // Group by subject
    const subjectStats: any = {};
    results.forEach(r => {
      const subjectName = r.exam_subjects?.subjects?.name || 'Unknown';
      const score = parseFloat(r.marks_obtained);
      const total = parseFloat(r.exam_subjects?.total_marks || '100');
      const pct = (score / total) * 100;

      if (!subjectStats[subjectName]) {
        subjectStats[subjectName] = {
          name: subjectName,
          scores: [],
          totalPct: 0,
          count: 0,
          history: [] // To track trend
        };
      }
      subjectStats[subjectName].scores.push(score);
      subjectStats[subjectName].totalPct += pct;
      subjectStats[subjectName].count += 1;
      subjectStats[subjectName].history.push({ pct, date: new Date(r.created_at) });
    });

    const processedSubjects = Object.values(subjectStats).map((s: any) => {
      const avg = s.totalPct / s.count;
      // Sort history by date to find trend
      const sortedHistory = s.history.sort((a: any, b: any) => a.date - b.date);
      let trend = 0;
      if (sortedHistory.length >= 2) {
        trend = sortedHistory[sortedHistory.length - 1].pct - sortedHistory[sortedHistory.length - 2].pct;
      }

      return {
        ...s,
        avg,
        max: Math.max(...s.scores),
        min: Math.min(...s.scores),
        trend
      };
    });

    // 1. Strongest & Weakest
    const strongest = [...processedSubjects].sort((a, b) => b.avg - a.avg)[0];
    const weakest = [...processedSubjects].sort((a, b) => a.avg - b.avg)[0];

    // 2. Best & Worst score overall
    const allPcts = results.map(r => (parseFloat(r.marks_obtained) / parseFloat(r.exam_subjects?.total_marks || '100')) * 100);
    const bestScore = Math.max(...allPcts);
    const worstScore = Math.min(...allPcts);
    const avgScore = allPcts.reduce((a, b) => a + b, 0) / allPcts.length;

    // 3. Improving & Falling Behind
    const improving = [...processedSubjects].filter(s => s.trend > 0).sort((a, b) => b.trend - a.trend)[0];
    const fallingBehind = [...processedSubjects].filter(s => s.trend < 0).sort((a, b) => a.trend - b.trend)[0];

    return {
      strongest,
      weakest,
      bestScore: Math.round(bestScore),
      worstScore: Math.round(worstScore),
      avgScore: Math.round(avgScore),
      improving,
      fallingBehind,
      subjectBreakdown: processedSubjects
    };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Get student profile
      const { data: profile } = await supabase
        .from('students')
        .select('*, profiles(full_name, email)')
        .eq('id', id)
        .single();
      
      setStudent(profile);

      // 2. Get all exam results
      const { data: results } = await supabase
        .from('exam_results')
        .select(`
          marks_obtained,
          created_at,
          exam_subjects(
            total_marks,
            subjects(name)
          )
        `)
        .eq('student_id', id);

      const stats = calculateDeepStats(results || []);
      setAnalytics(stats);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a1d2e" />
        <Text style={styles.loadingText}>Analyzing Performance Data...</Text>
      </View>
    );
  }

  const StatItem = ({ label, value, icon, color, subtext }: any) => (
    <View style={styles.statBox}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statText}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
        {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{student?.profiles?.full_name}</Text>
          <Text style={styles.headerSub}>Deep Performance Insights</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!analytics ? (
          <View style={styles.empty}>
            <Ionicons name="stats-chart" size={60} color="#D1D5DB" />
            <Text style={styles.emptyText}>No academic data available for analysis yet.</Text>
          </View>
        ) : (
          <>
            {/* Overview Row */}
            <View style={styles.overviewGrid}>
              <View style={[styles.miniStat, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.miniLabel}>AVG SCORE</Text>
                <Text style={[styles.miniValue, { color: '#1976D2' }]}>{analytics.avgScore}%</Text>
              </View>
              <View style={[styles.miniStat, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.miniLabel}>BEST SCORE</Text>
                <Text style={[styles.miniValue, { color: '#2E7D32' }]}>{analytics.bestScore}%</Text>
              </View>
              <View style={[styles.miniStat, { backgroundColor: '#FFEBEE' }]}>
                <Text style={styles.miniLabel}>WORST SCORE</Text>
                <Text style={[styles.miniValue, { color: '#C62828' }]}>{analytics.worstScore}%</Text>
              </View>
            </View>

            {/* Core Insights */}
            <Text style={styles.sectionTitle}>Key Academic Insights</Text>
            
            <StatItem 
              label="Strongest Subject" 
              value={analytics.strongest?.name} 
              icon="trophy" 
              color="#F59E0B"
              subtext={`Consistent performer with ${Math.round(analytics.strongest?.avg)}% average.`}
            />

            <StatItem 
              label="Weakest Subject" 
              value={analytics.weakest?.name} 
              icon="alert-circle" 
              color="#EF4444"
              subtext={`Action recommended. Current average: ${Math.round(analytics.weakest?.avg)}%.`}
            />

            {/* Trend Analysis */}
            <Text style={styles.sectionTitle}>Momentum & Trends</Text>

            <View style={styles.trendRow}>
              <View style={[styles.trendCard, { borderTopColor: '#10B981' }]}>
                <Ionicons name="trending-up" size={24} color="#10B981" />
                <Text style={styles.trendCardLabel}>Improving In</Text>
                <Text style={styles.trendCardValue}>{analytics.improving ? analytics.improving.name : 'N/A'}</Text>
                {analytics.improving && (
                  <Text style={styles.trendDelta}>+{Math.round(analytics.improving.trend)}% growth</Text>
                )}
              </View>

              <View style={[styles.trendCard, { borderTopColor: '#EF4444' }]}>
                <Ionicons name="trending-down" size={24} color="#EF4444" />
                <Text style={styles.trendCardLabel}>Falling Behind</Text>
                <Text style={styles.trendCardValue}>{analytics.fallingBehind ? analytics.fallingBehind.name : 'N/A'}</Text>
                {analytics.fallingBehind && (
                  <Text style={styles.trendDeltaDegraded}>{Math.round(analytics.fallingBehind.trend)}% drop</Text>
                )}
              </View>
            </View>

            {/* Performance Breakdown */}
            <Text style={styles.sectionTitle}>Subject Breakdown</Text>
            {analytics.subjectBreakdown.map((s: any) => (
              <View key={s.name} style={styles.subjectRow}>
                <View style={styles.subjectHeader}>
                  <Text style={styles.subjectName}>{s.name}</Text>
                  <Text style={styles.subjectPct}>{Math.round(s.avg)}%</Text>
                </View>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${s.avg}%`, backgroundColor: s.avg > 80 ? '#10B981' : s.avg > 60 ? '#3B82F6' : '#F59E0B' }]} />
                </View>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 15, fontSize: 13, color: '#64748b', fontWeight: '600' },
  header: { 
    backgroundColor: '#1a1d2e', 
    paddingTop: Platform.OS === 'android' ? 45 : 20, 
    paddingBottom: 25, 
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center'
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerInfo: { marginLeft: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  overviewGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  miniStat: { width: '31%', padding: 12, borderRadius: 15, alignItems: 'center' },
  miniLabel: { fontSize: 9, fontWeight: '800', color: '#64748b', marginBottom: 4 },
  miniValue: { fontSize: 16, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginTop: 10, marginBottom: 15 },
  statBox: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  statIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  statText: { flex: 1 },
  statLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' },
  statValue: { fontSize: 17, fontWeight: '800', color: '#1e293b', marginVertical: 2 },
  statSubtext: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  trendCard: { 
    width: '48%', 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 15, 
    borderTopWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  trendCardLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 8 },
  trendCardValue: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginVertical: 4 },
  trendDelta: { fontSize: 11, fontWeight: '700', color: '#10B981' },
  trendDeltaDegraded: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
  subjectRow: { marginBottom: 15 },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  subjectName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  subjectPct: { fontSize: 14, fontWeight: '800', color: '#64748b' },
  progressContainer: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 4 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 15, color: '#94A3B8', textAlign: 'center', fontWeight: '600' }
});
