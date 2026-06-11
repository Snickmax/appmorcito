import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlaceResult, SearchViewbox, searchPlaces } from '../../lib/geocodingService';

type Props = {
  getViewbox?: () => Promise<SearchViewbox | undefined>;
  onSelectPlace: (place: PlaceResult) => void;
};

export default function PlaceSearchBar({ getViewbox, onSelectPlace }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleSearch = async () => {
    const normalized = query.trim();
    if (!normalized || isSearching) return;

    Keyboard.dismiss();
    setIsSearching(true);
    setErrorText(null);

    try {
      const viewbox = (await getViewbox?.()) ?? undefined;
      const found = await searchPlaces(normalized, viewbox);
      setResults(found);
    } catch (error) {
      console.error(error);
      setResults(null);
      setErrorText('No se pudo buscar. Revisa tu conexión.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setErrorText(null);
  };

  const handleSelect = (place: PlaceResult) => {
    setResults(null);
    setQuery(place.title);
    onSelectPlace(place);
  };

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <Ionicons name="search" size={18} color="#9E4258" />

        <TextInput
          style={styles.input}
          placeholder="Buscar lugar o dirección"
          placeholderTextColor="#A66B79"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void handleSearch()}
          returnKeyType="search"
          autoCorrect={false}
        />

        {isSearching ? (
          <ActivityIndicator color="#C84B55" size="small" />
        ) : query.length > 0 ? (
          <Pressable onPress={handleClear} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#9E4258" />
          </Pressable>
        ) : null}
      </View>

      {errorText && (
        <View style={styles.dropdown}>
          <Text style={styles.emptyText}>{errorText}</Text>
        </View>
      )}

      {results && (
        <View style={styles.dropdown}>
          {results.length === 0 ? (
            <Text style={styles.emptyText}>No se encontró el lugar.</Text>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={styles.resultRow}
                  onPress={() => handleSelect(item)}
                >
                  <Ionicons name="location-outline" size={18} color="#C84B55" />

                  <View style={styles.resultTextWrap}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.resultSubtitle} numberOfLines={2}>
                      {item.subtitle}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          )}

          <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF0F4',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 42,
  },
  input: {
    flex: 1,
    color: '#7C3043',
    fontWeight: '700',
    paddingVertical: 0,
  },
  dropdown: {
    backgroundColor: '#FFF0F4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 280,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3B9C7',
  },
  resultTextWrap: {
    flex: 1,
  },
  resultTitle: {
    color: '#7C3043',
    fontWeight: '900',
  },
  resultSubtitle: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 11,
  },
  emptyText: {
    color: '#9E4258',
    fontWeight: '700',
    paddingVertical: 8,
    textAlign: 'center',
  },
  attribution: {
    color: '#9E4258',
    fontSize: 10,
    textAlign: 'right',
    paddingTop: 6,
  },
});
