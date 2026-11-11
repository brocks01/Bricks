import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ApiError, NetworkError } from '@/api/errors';
import { color, space } from '@/theme';

import { EmptyState } from './EmptyState';
import { Text } from './primitives/Text';

export interface QueryStateProps<T> {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  /** Sentence while loading ("Getting today's plan…"). */
  loadingText?: string;
  /** Sentence when the thing doesn't exist (404). */
  notFoundText?: string;
}

/**
 * Loading, error and "not found" states in plain words for any data screen
 * (S39): never a blank screen, a wordless spinner or a raw error.
 * Already-loaded data stays on screen while it refreshes in the background.
 */
export function QueryState<T>({ query, children, loadingText, notFoundText }: QueryStateProps<T>) {
  const { t } = useTranslation();

  if (query.data !== undefined) return <>{children(query.data)}</>;

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <EmptyState
        text={
          notFound && notFoundText
            ? notFoundText
            : query.error instanceof NetworkError
              ? t('common.networkError')
              : t('common.error')
        }
        actionLabel={notFound ? undefined : t('common.tryAgain')}
        onAction={notFound ? undefined : () => void query.refetch()}
        testID="query-error"
      />
    );
  }

  return (
    <View style={styles.loading} accessibilityLiveRegion="polite" testID="query-loading">
      <ActivityIndicator size="large" color={color.primary} />
      <Text color="textSecondary" align="center">
        {loadingText ?? t('common.loading')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xxl,
  },
});
