/**
 * Design-system lint rules (docs/02_DESIGN_PRINCIPLES.md §5).
 *
 * The point: a new page or feature gets the same look as the rest of the app without
 * anyone remembering to. Every page sits in <Screen>, every size and colour comes from
 * @/theme, and every word the member sees comes from the language files. Break one and
 * `npm run lint` (and CI) fails, saying what to use instead.
 */

/** Style keys whose numbers must come from a token (space, radius, iconSize, touch, ...). */
const SIZED_KEYS = new Set([
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingHorizontal',
  'paddingVertical',
  'paddingStart',
  'paddingEnd',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'marginStart',
  'marginEnd',
  'gap',
  'rowGap',
  'columnGap',
  'top',
  'bottom',
  'left',
  'right',
  'start',
  'end',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderWidth',
  'borderTopWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderRightWidth',
  'fontSize',
  'lineHeight',
  'letterSpacing',
]);

/** JSX props that size something on screen (icons, avatars, spacers). */
const SIZED_PROPS = new Set(['size', 'width', 'height', 'strokeWidth']);

/** JSX props the member reads or hears: they must come from t(...). */
const COPY_PROPS = new Set([
  'title',
  'subtitle',
  'label',
  'placeholder',
  'accessibilityLabel',
  'accessibilityHint',
  'loadingText',
  'emptyText',
  'message',
  'body',
  'hint',
]);

/**
 * A module constant that names a size (`const COVER = 96`): the same magic number with
 * a name on it. Durations, counts and scale factors (`_MS`, `_S`, `SCALE`, ...) are fine.
 */
const SIZE_NAME =
  /(SIZE|COVER|WELL|TILE|THUMB|WIDTH|HEIGHT|PAD|PADDING|OVERLAP|STROKE|GAP|MARGIN|INSET|BUTTON|ICON|(^|_)VIEW($|_))/;
const NOT_A_SIZE = /(_MS|_S|_M|SECONDS|SCALE|SHARE|COUNT|SHOWN)$/;

const CSS_COLOR =
  /^(rgba?|hsla?)\(|^(white|black|red|green|blue|gray|grey|yellow|orange|purple|pink)$/i;

/** 0 is "none", not a size; anything else is a magic number. */
const isMagic = (node) => {
  if (node.type === 'UnaryExpression' && node.operator === '-') node = node.argument;
  return node.type === 'Literal' && typeof node.value === 'number' && node.value !== 0;
};

/** The literal itself, or the one being added to a token (`space.sm + 3`). */
const magicIn = (node) => {
  if (isMagic(node)) return node;
  if (node.type === 'BinaryExpression' && (node.operator === '+' || node.operator === '-')) {
    return magicIn(node.left) ?? magicIn(node.right);
  }
  if (node.type === 'ConditionalExpression') {
    return magicIn(node.consequent) ?? magicIn(node.alternate);
  }
  return null;
};

const keyName = (prop) =>
  prop.key && (prop.key.type === 'Identifier' ? prop.key.name : prop.key.value);

const noRawSizes = {
  meta: {
    type: 'problem',
    docs: { description: 'Sizes, spacing and type come from @/theme tokens.' },
    messages: {
      raw: '`{{key}}` = {{value}} is a hardcoded size. Use a token from @/theme (space, radius, iconSize, touch, borderWidth, typeScale), or add one there.',
    },
    schema: [],
  },
  create(context) {
    const report = (node, key) =>
      context.report({
        node,
        messageId: 'raw',
        data: { key, value: context.sourceCode.getText(node) },
      });
    return {
      Property(node) {
        const key = keyName(node);
        if (!SIZED_KEYS.has(key)) return;
        const magic = magicIn(node.value);
        if (magic) report(magic, key);
      },
      VariableDeclarator(node) {
        const name = node.id.type === 'Identifier' ? node.id.name : '';
        if (!/^[A-Z][A-Z0-9_]*$/.test(name) || !SIZE_NAME.test(name) || NOT_A_SIZE.test(name)) {
          return;
        }
        const magic = node.init && magicIn(node.init);
        if (magic) report(magic, name);
      },
      AssignmentPattern(node) {
        // A default prop: `size = 56`.
        const key = node.left.type === 'Identifier' ? node.left.name : '';
        if (!SIZED_PROPS.has(key) && !SIZED_KEYS.has(key)) return;
        const magic = magicIn(node.right);
        if (magic) report(magic, key);
      },
      JSXAttribute(node) {
        const key = node.name.name;
        if (!SIZED_PROPS.has(key) || node.value?.type !== 'JSXExpressionContainer') return;
        const magic = magicIn(node.value.expression);
        if (magic) report(magic, key);
      },
    };
  },
};

const noRawColors = {
  meta: {
    type: 'problem',
    docs: { description: 'Colours come from @/theme tokens.' },
    messages: {
      raw: '"{{value}}" is a hardcoded colour. Use `color.*` (or categoryColor/sectionColor) from @/theme, or add a token there.',
    },
    schema: [],
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === 'string' && CSS_COLOR.test(node.value.trim())) {
          context.report({ node, messageId: 'raw', data: { value: node.value } });
        }
      },
    };
  },
};

const noHardcodedCopy = {
  meta: {
    type: 'problem',
    docs: { description: 'Words the member sees come from the language files.' },
    messages: {
      text: 'Hardcoded text "{{value}}". Put it in src/i18n/locales/*.json and use t(...), so it is translated and read out.',
      prop: 'Hardcoded `{{key}}="{{value}}"`. Put it in src/i18n/locales/*.json and use t(...).',
    },
    schema: [],
  },
  create(context) {
    const hasWords = (s) => /\p{L}/u.test(s);
    return {
      JSXText(node) {
        const value = node.value.trim();
        if (value && hasWords(value)) {
          context.report({ node, messageId: 'text', data: { value: value.slice(0, 40) } });
        }
      },
      JSXAttribute(node) {
        const key = node.name.name;
        if (!COPY_PROPS.has(key) || !node.value) return;
        const v =
          node.value.type === 'Literal'
            ? node.value
            : node.value.type === 'JSXExpressionContainer' &&
                node.value.expression.type === 'Literal'
              ? node.value.expression
              : null;
        if (v && typeof v.value === 'string' && hasWords(v.value)) {
          context.report({
            node: v,
            messageId: 'prop',
            data: { key, value: v.value.slice(0, 40) },
          });
        }
      },
    };
  },
};

/**
 * Every page renders <Screen>: the page background, Read it out, Back, Help, Buddy,
 * the offline banner, pull to refresh and small-phone spacing all come from it.
 * A route that only sends you elsewhere (<Redirect>) is the one exception.
 */
const pageUsesScreen = {
  meta: {
    type: 'problem',
    docs: { description: 'Every route renders the shared <Screen> layout.' },
    messages: {
      missing:
        'This page does not render <Screen> from @/components. Wrap it in <Screen title={t(...)} section="..."> so it gets the shared layout (or run `npm run new:page` to start from the template).',
    },
    schema: [],
  },
  create(context) {
    const file = context.filename.replace(/\\/g, '/');
    const isRoute =
      /\/src\/app\//.test(file) &&
      /\.tsx$/.test(file) &&
      !/\/_layout\.tsx$/.test(file) &&
      !/\.test\.tsx$/.test(file);
    if (!isRoute) return {};
    let found = false;
    return {
      JSXOpeningElement(node) {
        if (node.name.type === 'JSXIdentifier' && ['Screen', 'Redirect'].includes(node.name.name)) {
          found = true;
        }
      },
      'Program:exit'(node) {
        if (!found) context.report({ node, messageId: 'missing' });
      },
    };
  },
};

module.exports = {
  meta: { name: 'design-system' },
  rules: {
    'no-raw-sizes': noRawSizes,
    'no-raw-colors': noRawColors,
    'no-hardcoded-copy': noHardcodedCopy,
    'page-uses-screen': pageUsesScreen,
  },
};
