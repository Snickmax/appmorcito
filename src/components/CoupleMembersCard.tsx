import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ActiveCoupleMember } from '../providers/AuthProvider';

type Props = {
  members: ActiveCoupleMember[];
};

export default function CoupleMembersCard({ members }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Participantes</Text>

      <View style={styles.list}>
        {members.map((member) => {
          const name = member.display_name?.trim() || 'Sin nombre';
          const email = member.email?.trim() || 'Sin correo';
          const nickname = member.nickname?.trim() || 'Sin apodo';

          return (
            <View key={member.user_id} style={styles.item}>
              <View style={styles.mainRow}>
                <Text style={styles.name}>
                  {name} {member.is_me ? '(Tú)' : ''}
                </Text>
                <Text style={styles.role}>
                  {member.role === 'owner' ? 'Owner' : 'Member'}
                </Text>
              </View>

              <Text style={styles.nickname}>Apodo: {nickname}</Text>
              <Text style={styles.email}>{email}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF0F4',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3B9C7',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7C3043',
    marginBottom: 12,
  },
  list: {
    gap: 10,
  },
  item: {
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    padding: 12,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    color: '#7C3043',
    fontWeight: '800',
    flex: 1,
  },
  role: {
    color: '#9E4258',
    fontWeight: '700',
  },
  nickname: {
    color: '#9E4258',
    fontWeight: '700',
    marginTop: 2,
  },
  email: {
    color: '#9E4258',
    fontWeight: '600',
    marginTop: 2,
  },
});