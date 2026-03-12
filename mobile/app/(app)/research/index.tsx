import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { ResearchProject } from '@/types';

const STATUS_COLOR: Record<string, string> = {
  open: '#5a9e6f',
  in_progress: '#f59e0b',
  completed: '#9baab6',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
};

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({
  project,
  myId,
  onPress,
  onJoinLeave,
}: {
  project: ResearchProject;
  myId: string;
  onPress: () => void;
  onJoinLeave: (project: ResearchProject) => void;
}) {
  const isCreator = project.creatorId === myId;
  const isMember = (project.collaboratorIds ?? []).includes(myId);
  const statusColor = STATUS_COLOR[project.status] ?? '#9baab6';
  const statusLabel = STATUS_LABEL[project.status] ?? project.status;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <View style={[styles.iconBox, { backgroundColor: statusColor + '22' }]}>
          <Feather name="cpu" size={18} color={statusColor} />
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>{project.title}</Text>
      <Text style={styles.cardDesc} numberOfLines={2}>{project.description}</Text>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Feather name="tag" size={12} color="#9baab6" />
          <Text style={styles.metaText}>{project.domain}</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="users" size={12} color="#9baab6" />
          <Text style={styles.metaText}>{(project.collaboratorIds ?? []).length} collaborators</Text>
        </View>
      </View>

      {project.tags?.length > 0 && (
        <View style={styles.tagsRow}>
          {project.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {!isCreator && (
        <TouchableOpacity
          style={[styles.joinBtn, isMember && styles.leaveBtn]}
          onPress={(e) => { onJoinLeave(project); }}
          disabled={project.status === 'completed' && !isMember}
        >
          <Text style={[styles.joinBtnText, isMember && styles.leaveBtnText]}>
            {isMember ? 'Leave' : project.status === 'completed' ? 'Closed' : 'Join'}
          </Text>
        </TouchableOpacity>
      )}

      {isCreator && (
        <View style={styles.creatorBadge}>
          <Text style={styles.creatorBadgeText}>Your project</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({
  project,
  myId,
  onClose,
  onJoin,
  onLeave,
  onStatusUpdate,
}: {
  project: ResearchProject;
  myId: string;
  onClose: () => void;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  onStatusUpdate: (id: string, status: ResearchProject['status']) => void;
}) {
  const isCreator = project.creatorId === myId;
  const isMember = (project.collaboratorIds ?? []).includes(myId);
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    setLoading(true);
    try {
      await api.post(`/api/v1/research/${project._id}/join`);
      onJoin(project._id);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to join');
    } finally { setLoading(false); }
  }

  async function handleLeave() {
    Alert.alert('Leave Project', 'Are you sure you want to leave this project?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          setLoading(true);
          try {
            await api.delete(`/api/v1/research/${project._id}/leave`);
            onLeave(project._id);
            onClose();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to leave');
          } finally { setLoading(false); }
        },
      },
    ]);
  }

  async function handleStatus(status: ResearchProject['status']) {
    try {
      await api.put(`/api/v1/research/${project._id}`, { status });
      onStatusUpdate(project._id, status);
    } catch {
      Alert.alert('Error', 'Failed to update status');
    }
  }

  const statusColor = STATUS_COLOR[project.status] ?? '#9baab6';

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.modalTitle}>{project.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', marginTop: 6, alignSelf: 'flex-start' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABEL[project.status] ?? project.status}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={22} color="#5a6a7e" />
              </TouchableOpacity>
            </View>

            {/* Description */}
            <Text style={styles.modalDesc}>{project.description}</Text>

            {/* Meta */}
            <View style={styles.modalMeta}>
              <View style={styles.metaItem}>
                <Feather name="tag" size={13} color="#9baab6" />
                <Text style={styles.metaText}>{project.domain}</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="users" size={13} color="#9baab6" />
                <Text style={styles.metaText}>{(project.collaboratorIds ?? []).length} collaborators</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="user" size={13} color="#9baab6" />
                <Text style={styles.metaText}>Created by {project.creatorName}</Text>
              </View>
            </View>

            {/* Tags */}
            {project.tags?.length > 0 && (
              <View style={styles.tagsRow}>
                {project.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Status update (creator only) */}
            {isCreator && (
              <View style={styles.statusSection}>
                <Text style={styles.sectionLabel}>Update Status</Text>
                {(['open', 'in_progress', 'completed'] as ResearchProject['status'][]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusOption, project.status === s && styles.statusOptionActive]}
                    onPress={() => handleStatus(s)}
                  >
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[s] }]} />
                    <Text style={[styles.statusOptionText, project.status === s && styles.statusOptionTextActive]}>
                      {STATUS_LABEL[s]}
                    </Text>
                    {project.status === s && <Feather name="check" size={16} color="#5a9e6f" style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Join / Leave */}
            {!isCreator && (
              <View style={styles.actionRow}>
                {isMember ? (
                  <TouchableOpacity style={styles.leaveBtnLg} onPress={handleLeave} disabled={loading}>
                    {loading ? <ActivityIndicator color="#ef4444" size="small" /> : <Text style={styles.leaveBtnLgText}>Leave Project</Text>}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.joinBtnLg, project.status === 'completed' && styles.disabledBtn]}
                    onPress={handleJoin}
                    disabled={loading || project.status === 'completed'}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.joinBtnLgText}>
                        {project.status === 'completed' ? 'Project Completed' : 'Join Project'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (p: ResearchProject) => void;
}) {
  const [form, setForm] = useState({ title: '', description: '', domain: '', tags: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!form.title.trim() || !form.description.trim() || !form.domain.trim()) {
      Alert.alert('Validation', 'Title, description, and domain are required.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/v1/research', {
        title: form.title.trim(),
        description: form.description.trim(),
        domain: form.domain.trim(),
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      });
      onSuccess(data.data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create project');
    } finally { setLoading(false); }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Research Project</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={22} color="#5a6a7e" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { key: 'title', label: 'Title', placeholder: 'e.g. AI-Powered Diagnostics', multiline: false },
                { key: 'domain', label: 'Domain', placeholder: 'e.g. Machine Learning', multiline: false },
              ].map(({ key, label, placeholder, multiline }) => (
                <View key={key} style={styles.formField}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#9baab6"
                    value={(form as any)[key]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    multiline={multiline}
                  />
                </View>
              ))}

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Describe the research project…"
                  placeholderTextColor="#9baab6"
                  value={form.description}
                  onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Tags <Text style={styles.fieldLabelOptional}>(comma-separated, optional)</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Python, NLP, Data Science"
                  placeholderTextColor="#9baab6"
                  value={form.tags}
                  onChangeText={(v) => setForm((f) => ({ ...f, tags: v }))}
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.disabledBtn]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Create Project</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Research Screen ──────────────────────────────────────────────────────────
export default function ResearchScreen() {
  const user = useAuthStore((s) => s.user);
  const myId = user?.userId ?? '';

  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailProject, setDetailProject] = useState<ResearchProject | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function fetchProjects() {
    try {
      const { data } = await api.get('/api/v1/research?limit=30');
      setProjects(data.data ?? []);
    } catch {}
  }

  async function loadInitial() {
    setLoading(true);
    await fetchProjects();
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  }

  useEffect(() => { loadInitial(); }, []);

  function onJoin(id: string) {
    setProjects((prev) =>
      prev.map((p) => p._id === id ? { ...p, collaboratorIds: [...(p.collaboratorIds ?? []), myId] } : p)
    );
    setDetailProject((prev) =>
      prev?._id === id ? { ...prev, collaboratorIds: [...(prev.collaboratorIds ?? []), myId] } : prev
    );
  }

  function onLeave(id: string) {
    setProjects((prev) =>
      prev.map((p) => p._id === id ? { ...p, collaboratorIds: (p.collaboratorIds ?? []).filter((c) => c !== myId) } : p)
    );
    setDetailProject(null);
  }

  function onStatusUpdate(id: string, status: ResearchProject['status']) {
    setProjects((prev) =>
      prev.map((p) => p._id === id ? { ...p, status } : p)
    );
    setDetailProject((prev) =>
      prev?._id === id ? { ...prev, status } : prev
    );
  }

  async function handleJoinLeave(project: ResearchProject) {
    const isMember = (project.collaboratorIds ?? []).includes(myId);
    if (isMember) {
      Alert.alert('Leave Project', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave', style: 'destructive', onPress: async () => {
            try {
              await api.delete(`/api/v1/research/${project._id}/leave`);
              onLeave(project._id);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to leave');
            }
          },
        },
      ]);
    } else {
      try {
        await api.post(`/api/v1/research/${project._id}/join`);
        onJoin(project._id);
      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.error || 'Failed to join');
      }
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Research</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreate(true)}>
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#5a9e6f" size="large" />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              myId={myId}
              onPress={() => setDetailProject(item)}
              onJoinLeave={handleJoinLeave}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#5a9e6f"
              colors={['#5a9e6f']}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="cpu" size={40} color="#c8ddd0" />
              <Text style={styles.emptyText}>No research projects yet.</Text>
            </View>
          }
        />
      )}

      {detailProject && (
        <DetailModal
          project={detailProject}
          myId={myId}
          onClose={() => setDetailProject(null)}
          onJoin={onJoin}
          onLeave={onLeave}
          onStatusUpdate={onStatusUpdate}
        />
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSuccess={(p) => {
            setProjects((prev) => [p, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e4ebe6' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#eef3ef',
    borderBottomWidth: 1,
    borderBottomColor: '#c8ddd0',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e2a3a' },
  newBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5a9e6f',
    alignItems: 'center',
    justifyContent: 'center',
  },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingTop: 8, paddingBottom: 24 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#9baab6', fontWeight: '500' },

  // Card
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
    gap: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1e2a3a', lineHeight: 21 },
  cardDesc: { fontSize: 13, color: '#5a6a7e', lineHeight: 19 },
  cardMeta: { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#9baab6', fontWeight: '500' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: '#dde8e1',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: { fontSize: 11, color: '#5a6a7e', fontWeight: '600' },

  joinBtn: {
    marginTop: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#5a9e6f',
    alignItems: 'center',
  },
  leaveBtn: { borderColor: '#ef4444' },
  joinBtnText: { fontSize: 13, fontWeight: '700', color: '#5a9e6f' },
  leaveBtnText: { color: '#ef4444' },
  creatorBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#5a9e6f22',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  creatorBadgeText: { fontSize: 12, color: '#5a9e6f', fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#eef3ef',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#c8ddd0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e2a3a', flex: 1 },
  closeBtn: { padding: 4 },
  modalDesc: { fontSize: 14, color: '#5a6a7e', lineHeight: 22, marginBottom: 14 },
  modalMeta: { gap: 6, marginBottom: 14 },

  statusSection: { marginTop: 16, marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#5a6a7e', marginBottom: 8 },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#e4ebe6',
    marginBottom: 6,
    gap: 10,
  },
  statusOptionActive: { backgroundColor: '#5a9e6f1a', borderWidth: 1.5, borderColor: '#5a9e6f' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionText: { fontSize: 14, color: '#5a6a7e', fontWeight: '500', flex: 1 },
  statusOptionTextActive: { color: '#1e2a3a', fontWeight: '700' },

  actionRow: { marginTop: 16 },
  joinBtnLg: {
    backgroundColor: '#5a9e6f',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  joinBtnLgText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  leaveBtnLg: {
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  leaveBtnLgText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
  disabledBtn: { opacity: 0.5 },

  // Form
  formField: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#5a6a7e', marginBottom: 6 },
  fieldLabelOptional: { fontWeight: '400', color: '#9baab6' },
  input: {
    backgroundColor: '#e4ebe6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1e2a3a',
    borderWidth: 1,
    borderColor: '#c8ddd0',
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#c8ddd0',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#5a6a7e' },
  submitBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#5a9e6f',
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
