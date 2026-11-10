import { Asset } from 'expo-asset';
import { Redirect } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Avatar,
  BigButton,
  CalendarBlankIcon,
  Card,
  ClubCard,
  ConfirmSheet,
  EmptyState,
  EventCard,
  HandHeartIcon,
  ListeningSheet,
  PersonSimpleWalkIcon,
  PhoneIcon,
  PromptCard,
  Screen,
  SectionCard,
  StatCard,
  StatusBanner,
  StepProgress,
  TellMeButton,
  Text,
  Tile,
  TileGrid,
  UndoBar,
  UsersThreeIcon,
  UsersIcon,
  VoiceNoteBubble,
  YesNo,
} from '@/components';
import { sampleContent, type GalleryLanguage } from '@/features/dev/gallerySamples';
import i18n from '@/i18n';
import { config } from '@/lib/config';
import { weekdayLabels } from '@/lib/format';
import { borderWidth, color, screenPadding, space } from '@/theme';
import { TypographyProvider, useTypography } from '@/theme/TypographyProvider';

// Dev-only clip so the voice players have something real to play.
const SAMPLE_AUDIO = Asset.fromModule(require('../../../assets/dev/voice-sample.wav')).uri;

/**
 * Component gallery (iteration 0.2): every building block in every state, at
 * 100% and 200% text and in English and Tamil, for design sign-off against the
 * Mobbin board. Only reachable when developer tools are on.
 */
export default function ComponentGallery() {
  if (!config.devTools) return <Redirect href="/home" />;
  return <Gallery />;
}

function Gallery() {
  const { fontsLoaded } = useTypography();
  const [lang, setLang] = useState<GalleryLanguage>('en');
  const [scale, setScale] = useState<1 | 2>(1);
  const [undo, setUndo] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // A private copy of i18n, so switching the preview language leaves the app alone.
  const previewI18n = useMemo(() => i18n.cloneInstance({ lng: lang }), [lang]);

  return (
    <View style={styles.root}>
      <Screen
        title="Component gallery"
        readOut="Component gallery. Every building block of the app, for design review."
        standalone
        testID="screen-gallery"
      >
        <Controls lang={lang} setLang={setLang} scale={scale} setScale={setScale} />
        <I18nextProvider i18n={previewI18n}>
          <TypographyProvider language={lang} fontsLoaded={fontsLoaded} fontScale={scale}>
            <Samples lang={lang} onUndoable={setUndo} />
          </TypographyProvider>
        </I18nextProvider>
      </Screen>

      <I18nextProvider i18n={previewI18n}>
        <TypographyProvider language={lang} fontsLoaded={fontsLoaded} fontScale={scale}>
          <UndoBar
            visible={undo !== null}
            message={undo ?? ''}
            onUndo={() => {}}
            onDismiss={() => setUndo(null)}
            style={[styles.undo, { bottom: insets.bottom + space.sm }]}
          />
        </TypographyProvider>
      </I18nextProvider>
    </View>
  );
}

function Controls({
  lang,
  setLang,
  scale,
  setScale,
}: {
  lang: GalleryLanguage;
  setLang: (l: GalleryLanguage) => void;
  scale: 1 | 2;
  setScale: (s: 1 | 2) => void;
}) {
  return (
    <Card tone="subtle">
      <Text variant="bodyStrong">Text size</Text>
      <View style={styles.pair}>
        {([1, 2] as const).map((s) => (
          <View key={s} style={styles.flex}>
            <BigButton
              variant={scale === s ? 'primary' : 'outline'}
              label={`${s * 100}%`}
              onPress={() => setScale(s)}
              accessibilityState={{ selected: scale === s }}
              testID={`gallery-scale-${s}`}
            />
          </View>
        ))}
      </View>
      <Text variant="bodyStrong">Language</Text>
      <View style={styles.pair}>
        {(['en', 'ta'] as const).map((l) => (
          <View key={l} style={styles.flex}>
            <BigButton
              variant={lang === l ? 'primary' : 'outline'}
              label={l === 'en' ? 'English' : 'தமிழ்'}
              onPress={() => setLang(l)}
              testID={`gallery-lang-${l}`}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}

function Section({
  name,
  reference,
  children,
}: {
  name: string;
  reference: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text variant="title">{name}</Text>
      <Text color="textSecondary">Inspired by {reference}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Samples({ lang, onUndoable }: { lang: GalleryLanguage; onUndoable: (m: string) => void }) {
  const s = sampleContent(lang);
  const days = weekdayLabels(lang);
  const [listening, setListening] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const noop = () => {};

  return (
    <>
      <Section name="BigButton" reference="Be My Eyes">
        <BigButton label="Primary" icon={PersonSimpleWalkIcon} onPress={noop} />
        <BigButton label="Success" variant="success" onPress={noop} />
        <BigButton label="Outline" variant="outline" icon={CalendarBlankIcon} onPress={noop} />
        <BigButton label="Call 995 now" variant="sos" size="xl" icon={PhoneIcon} onPress={noop} />
        <BigButton label="Disabled" disabled onPress={noop} />
      </Section>

      <Section name="YesNo" reference="Monzo">
        <YesNo onYes={noop} onNo={noop} />
      </Section>

      <Section name="SectionCard" reference="Grab (Home pillars)">
        <SectionCard
          icon={UsersThreeIcon}
          title={s.section.title}
          description={s.section.description}
          onPress={noop}
        />
      </Section>

      <Section name="EventCard" reference="Luma">
        <EventCard event={s.walk} onOpen={noop} onGoing={() => onUndoable(s.undo)} />
        <EventCard event={s.chess} onOpen={noop} onGoing={noop} />
      </Section>

      <Section name="ClubCard" reference="Strava Clubs">
        <ClubCard circle={s.walkers} onOpen={noop} onJoin={noop} onWhatsApp={noop} />
        <ClubCard circle={s.gardeners} onOpen={noop} onJoin={noop} onWhatsApp={noop} />
      </Section>

      <Section name="StatCard" reference="Apple Health">
        <StatCard
          label={s.stat.label}
          value={s.stat.value}
          unit={s.stat.unit}
          sub={s.stat.sub}
          bars={s.stat.values.map((value, i) => ({ label: days[i] ?? '', value, done: value > 0 }))}
        />
      </Section>

      <Section name="Tile" reference="Grab">
        <TileGrid>
          <Tile icon={PersonSimpleWalkIcon} label={s.tiles[0]!} onPress={noop} />
          <Tile icon={CalendarBlankIcon} label={s.tiles[1]!} onPress={noop} />
          <Tile icon={HandHeartIcon} label={s.tiles[2]!} onPress={noop} />
          <Tile icon={UsersIcon} label={s.tiles[3]!} onPress={noop} />
        </TileGrid>
      </Section>

      <Section name="PromptCard" reference="Hinge">
        <PromptCard
          prompt={s.prompt}
          audioUrl={SAMPLE_AUDIO}
          durationS={4}
          transcript={s.promptTranscript}
          onRecord={noop}
        />
        <PromptCard prompt={s.prompt} onRecord={noop} />
      </Section>

      <Section name="VoiceNoteBubble" reference="WhatsApp">
        <VoiceNoteBubble
          name={s.thanksName}
          audioUrl={SAMPLE_AUDIO}
          durationS={4}
          transcript={s.thanksTranscript}
          skill={s.thanksSkill}
        />
      </Section>

      <Section name="Avatar" reference="WhatsApp">
        <View style={styles.pair}>
          <Avatar name="Raj Kumar" />
          <Avatar name={s.thanksName} size={64} />
        </View>
      </Section>

      <Section name="TellMeButton" reference="Be My Eyes">
        <TellMeButton onPress={() => setListening(true)} />
        <TellMeButton onPress={noop} listening />
      </Section>

      <Section name="ListeningSheet + ConfirmSheet + UndoBar" reference="Be My Eyes, Monzo">
        <Text>Opens the voice flow: listening, then confirm, then undo.</Text>
        <BigButton
          label="Try the voice flow"
          variant="outline"
          onPress={() => setListening(true)}
        />
        <ListeningSheet
          visible={listening}
          transcript={s.transcript}
          onStop={() => {
            setListening(false);
            setConfirming(true);
          }}
        />
        <ConfirmSheet
          visible={confirming}
          text={s.confirm}
          onYes={() => {
            setConfirming(false);
            onUndoable(s.undo);
          }}
          onNo={() => setConfirming(false)}
        />
      </Section>

      <Section name="StepProgress" reference="Airbnb">
        <StepProgress step={2} total={3} />
      </Section>

      <Section name="StatusBanner" reference="Monzo, Be My Eyes">
        <StatusBanner tone="success" text={s.statusSuccess} />
        <StatusBanner tone="info" text={s.statusInfo} />
        <StatusBanner tone="notice" text={s.statusNotice} />
      </Section>

      <Section name="EmptyState" reference="Monzo">
        <Card>
          <EmptyState
            icon={CalendarBlankIcon}
            text={s.empty}
            actionLabel={s.emptyAction}
            onAction={noop}
          />
        </Card>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg,
  },
  flex: {
    flex: 1,
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  section: {
    gap: space.xs,
    paddingTop: space.lg,
    marginTop: space.sm,
    borderTopWidth: borderWidth.hairline,
    borderTopColor: color.border,
  },
  sectionBody: {
    gap: space.sm,
    marginTop: space.xs,
  },
  undo: {
    position: 'absolute',
    left: screenPadding,
    right: screenPadding,
  },
});
