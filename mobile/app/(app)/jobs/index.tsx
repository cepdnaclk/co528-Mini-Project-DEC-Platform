import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import EmptyState from '@/components/EmptyState';
import { Job } from '@/types';

// labels shown in UI → values sent to backend
const JOB_TYPES: { label: string; value: string }[] = [
  { label: 'All',        value: 'All' },
  { label: 'Full-time',  value: 'full-time' },
  { label: 'Part-time',  value: 'part-time' },
  { label: 'Internship', value: 'internship' },
  { label: 'Contract',   value: 'contract' },
];

interface ApplyModalProps {
  job: Job | null;
  visible: boolean;
  onClose: () => void;
}

function ApplyModal({ job, visible, onClose }: ApplyModalProps) {
  const [coverLetter, setCoverLetter] = useState('');
  const [cvUrl, setCvUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleApply() {
    if (!job) return;
    setSubmitting(true);
    try {
      await api.post(`/api/v1/jobs/${job._id}/apply`, {
        coverLetter: coverLetter.trim() || undefined,
        cvUrl: cvUrl.trim() || undefined,
      });
      Alert.alert('Success', 'Application submitted successfully!');
      setCoverLetter('');
      setCvUrl('');
      onClose();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to submit application.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title} numberOfLines={1}>
            Apply: {job?.title}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color="#1e2a3a" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={modalStyles.body} keyboardShouldPersistTaps="handled">
            <View style={modalStyles.companyRow}>
              <Feather name="briefcase" size={16} color="#5a9e6f" />
              <Text style={modalStyles.company}>{job?.company}</Text>
            </View>

            <Text style={modalStyles.label}>Cover Letter</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.multiline]}
              value={coverLetter}
              onChangeText={setCoverLetter}
              placeholder="Tell them why you're a great fit..."
              placeholderTextColor="#9baab6"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <Text style={modalStyles.label}>CV / Resume URL (optional)</Text>
            <TextInput
              style={modalStyles.input}
              value={cvUrl}
              onChangeText={setCvUrl}
              placeholder="https://drive.google.com/..."
              placeholderTextColor="#9baab6"
              autoCapitalize="none"
              keyboardType="url"
            />

            <TouchableOpacity
              style={[modalStyles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleApply}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={modalStyles.submitBtnText}>Submit Application</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e4ebe6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#c8ddd0',
    backgroundColor: '#eef3ef',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#1e2a3a', flex: 1, marginRight: 12 },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  company: { fontSize: 15, color: '#5a9e6f', fontWeight: '600' },
  body: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#1e2a3a', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e2a3a',
    borderWidth: 1,
    borderColor: '#c8ddd0',
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: '#5a9e6f',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

// ─── Job Card ────────────────────────────────────────────────────────────────

function JobCard({ job, onApply }: { job: Job; onApply: (job: Job) => void }) {
  const timestamp = (() => {
    try {
      return formatDistanceToNow(new Date(job.createdAt), { addSuffix: true });
    } catch {
      return '';
    }
  })();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobCompany}>{job.company}</Text>
        </View>
        <View style={[styles.typeBadge, typeColor(job.type)]}>
          <Text style={styles.typeText}>{job.type}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {job.description}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.timestamp}>{timestamp}</Text>
        <TouchableOpacity style={styles.applyBtn} onPress={() => onApply(job)}>
          <Text style={styles.applyBtnText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function typeColor(type: string) {
  const map: Record<string, object> = {
    'full-time':  { backgroundColor: '#d1fae5' },
    'part-time':  { backgroundColor: '#dbeafe' },
    'internship': { backgroundColor: '#fef3c7' },
    'contract':   { backgroundColor: '#ede9fe' },
  };
  return map[type] ?? { backgroundColor: '#f1f5f9' };
}

// ─── Jobs Screen ─────────────────────────────────────────────────────────────

export default function JobsScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  async function fetchJobs(pg = 1, searchQ = search, type = typeFilter, append = false) {
    try {
      const params: Record<string, string> = { page: String(pg), limit: '20' };
      if (searchQ.trim()) params.search = searchQ.trim();
      if (type !== 'All') params.type = type;
      const { data } = await api.get('/api/v1/jobs', { params });
      const fetched: Job[] = data.data ?? [];
      const pagination = data.pagination ?? {};
      if (append) {
        setJobs((prev) => [...prev, ...fetched]);
      } else {
        setJobs(fetched);
      }
      setHasMore(pg < (pagination.totalPages ?? 1));
      setPage(pg);
    } catch {}
  }

  async function loadInitial() {
    setLoading(true);
    await fetchJobs(1);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchJobs(1);
    setRefreshing(false);
  }

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchJobs(page + 1, search, typeFilter, true);
    setLoadingMore(false);
  }

  useEffect(() => {
    loadInitial();
  }, []);

  function applySearch() {
    setSearch(searchInput);
    setLoading(true);
    fetchJobs(1, searchInput, typeFilter).finally(() => setLoading(false));
  }

  function applyTypeFilter(type: string) {
    setTypeFilter(type);
    setLoading(true);
    fetchJobs(1, search, type).finally(() => setLoading(false));
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Board</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search jobs..."
          placeholderTextColor="#9baab6"
          onSubmitEditing={applySearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={applySearch}>
          <Feather name="search" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Type chips — fixed height, never moves */}
      <View style={styles.chipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {JOB_TYPES.map(({ label, value }) => (
            <TouchableOpacity
              key={value}
              style={[styles.chip, typeFilter === value && styles.chipActive]}
              onPress={() => applyTypeFilter(value)}
            >
              <Text style={[styles.chipText, typeFilter === value && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List area — always flex:1 so it absorbs all remaining space */}
      <View style={styles.listArea}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#5a9e6f" size="large" />
          </View>
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <JobCard job={item} onApply={setApplyJob} />}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#5a9e6f"
                colors={['#5a9e6f']}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={<EmptyState message="No jobs found. Try adjusting your search." />}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator color="#5a9e6f" style={{ marginVertical: 16 }} />
              ) : null
            }
          />
        )}
      </View>

      <ApplyModal
        job={applyJob}
        visible={!!applyJob}
        onClose={() => setApplyJob(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e4ebe6' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#eef3ef',
    borderBottomWidth: 1,
    borderBottomColor: '#c8ddd0',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e2a3a' },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#eef3ef',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e2a3a',
    borderWidth: 1,
    borderColor: '#c8ddd0',
  },
  searchBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#5a9e6f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsWrapper: {
    height: 56,
    backgroundColor: '#e4ebe6',
  },
  listArea: {
    flex: 1,
  },
  chips: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#c8ddd0',
    marginRight: 8,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: '#5a9e6f', borderColor: '#5a9e6f' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#5a6a7e', lineHeight: 18 },
  chipTextActive: { color: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingTop: 8, paddingBottom: 24 },
  card: {
    backgroundColor: '#eef3ef',
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: '#1e2a3a', marginBottom: 2 },
  jobCompany: { fontSize: 13, color: '#5a9e6f', fontWeight: '600' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 8 },
  typeText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  description: { fontSize: 14, color: '#5a6a7e', lineHeight: 20 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#dde8e1',
  },
  timestamp: { fontSize: 12, color: '#9baab6' },
  applyBtn: {
    backgroundColor: '#5a9e6f',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  applyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
