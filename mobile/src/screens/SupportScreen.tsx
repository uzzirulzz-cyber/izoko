import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { Button, Card, EmptyState, Input } from '../components/ui';
import {
  fetchSupportMessages,
  sendSupportMessage,
  startSupport,
  type ChatMessage,
} from '../api/store';
import { useAuth } from '../state/AuthContext';
import * as SecureStore from 'expo-secure-store';

const CONV_KEY = 'playbeat_support_conversation_id';

/**
 * Support chat — same live-support thread system the website uses
 * (/api/messages/start + /api/messages/mine). Customer messages go to the
 * admin Message Box; staff replies stream back here.
 */
export function SupportScreen() {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(CONV_KEY);
      if (saved) {
        setConversationId(saved);
        try {
          setMessages(await fetchSupportMessages(saved));
        } catch {
          /* thread will load after first send */
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    const t = setInterval(async () => {
      try {
        setMessages(await fetchSupportMessages(conversationId));
      } catch {
        /* keep last state */
      }
    }, 10000);
    return () => clearInterval(t);
  }, [conversationId]);

  const start = async () => {
    if (!draft.trim()) return;
    setError('');
    setStarting(true);
    try {
      const id = await startSupport(
        user?.name || 'App customer',
        user?.email || 'app-user@playbeat.digital',
        draft.trim()
      );
      await SecureStore.setItemAsync(CONV_KEY, id);
      setConversationId(id);
      setMessages(await fetchSupportMessages(id));
      setDraft('');
    } catch (e: any) {
      setError(e.message || 'Could not start the chat.');
    } finally {
      setStarting(false);
    }
  };

  const send = async () => {
    if (!draft.trim() || !conversationId) return;
    setSending(true);
    try {
      await sendSupportMessage(conversationId, draft.trim());
      setMessages(await fetchSupportMessages(conversationId));
      setDraft('');
    } catch (e: any) {
      setError(e.message || 'Message failed to send.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
        <Text style={{ color: colors.white, fontSize: 18, fontWeight: '900' }}>Support</Text>
        <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 2 }}>
          24/7 live chat with the PlayBeat team — replies in minutes
        </Text>
      </View>

      {messages.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={
            <Card style={{ gap: 10 }}>
              <Text style={{ color: colors.white, fontSize: 14, fontWeight: '800' }}>👋 How can we help?</Text>
              <Text style={{ color: colors.textDim, fontSize: 12, lineHeight: 18 }}>
                Ask about an order, payment, license key or anything else. Your message opens a
                live-support thread — the same inbox our website chat uses.
              </Text>
              <Input
                value={draft}
                onChangeText={setDraft}
                placeholder="Describe your issue…"
                autoCapitalize="sentences"
              />
              {error ? <Text style={{ color: colors.red, fontSize: 11.5 }}>{error}</Text> : null}
              <Button label={starting ? 'Starting chat…' : 'Start chat'} onPress={start} loading={starting} />
            </Card>
          }
        />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 14, gap: 8 }}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => {
            const mine = item.senderType === 'customer';
            return (
              <View style={{ flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  {!mine && (
                    <Text style={{ color: colors.amber, fontSize: 9.5, fontWeight: '900', marginBottom: 2 }}>
                      PLAYBEAT TEAM
                    </Text>
                  )}
                  <Text style={{ color: mine ? colors.black : colors.text, fontSize: 12.5, lineHeight: 18 }}>
                    {item.body}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {messages.length > 0 ? (
        <View style={styles.replyBar}>
          <View style={{ flex: 1 }}>
            <Input value={draft} onChangeText={setDraft} placeholder="Type a message…" autoCapitalize="sentences" />
          </View>
          <View style={{ width: 92 }}>
            <Button label="Send" onPress={send} loading={sending} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bubbleMine: {
    backgroundColor: colors.amber,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
});
