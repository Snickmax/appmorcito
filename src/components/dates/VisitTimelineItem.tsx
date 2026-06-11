import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { DateVisitWithUrl } from '../../types/dates';
import { formatDateLong } from '../../utils/countdown';

type Props = {
  visit: DateVisitWithUrl;
  isMine: boolean;
  authorName: string;
  onPressPhoto: (signedUrl: string) => void;
};

export default function VisitTimelineItem({
  visit,
  isMine,
  authorName,
  onPressPhoto,
}: Props) {
  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowPartner]}>
      <View
        style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubblePartner]}
      >
        <Text style={styles.dateText}>{formatDateLong(visit.visited_at)}</Text>

        {visit.signedUrl ? (
          <Pressable onPress={() => onPressPhoto(visit.signedUrl as string)}>
            <Image source={{ uri: visit.signedUrl }} style={styles.photo} />
          </Pressable>
        ) : (
          <View style={styles.noPhoto}>
            <Text style={styles.noPhotoHeart}>❤</Text>
            <Text style={styles.noPhotoText}>Visita sin foto</Text>
          </View>
        )}

        <Text style={styles.authorText}>{authorName}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowPartner: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    minWidth: 160,
    borderRadius: 20,
    padding: 10,
  },
  bubbleMine: {
    backgroundColor: '#FFD9E0',
    borderTopRightRadius: 6,
  },
  bubblePartner: {
    backgroundColor: '#FFF0F4',
    borderTopLeftRadius: 6,
  },
  dateText: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 13,
    marginBottom: 6,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#FFE7EE',
  },
  noPhoto: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFE7EE',
    borderRadius: 14,
  },
  noPhotoHeart: {
    fontSize: 26,
    color: '#D96A7E',
  },
  noPhotoText: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 4,
  },
  authorText: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right',
  },
});
