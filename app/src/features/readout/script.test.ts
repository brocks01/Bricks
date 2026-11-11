import { splitSentences, toParts } from './script';

describe('splitSentences', () => {
  it('splits at full stops, question and exclamation marks', () => {
    expect(splitSentences('Thrive. Did you move yesterday? Well done!')).toEqual([
      'Thrive.',
      'Did you move yesterday?',
      'Well done!',
    ]);
  });

  it('keeps numbers like 2.4 km whole', () => {
    expect(splitSentences('You walked 2.4 km. Great.')).toEqual(['You walked 2.4 km.', 'Great.']);
  });

  it('splits Chinese at full-width marks without spaces', () => {
    expect(splitSentences('你好。请选择语言。')).toEqual(['你好。', '请选择语言。']);
  });

  it('keeps a closing quote with its sentence and drops empty parts', () => {
    expect(splitSentences('Say "Hello."  Then wait.  ')).toEqual(['Say "Hello."', 'Then wait.']);
    expect(splitSentences('   ')).toEqual([]);
  });
});

describe('toParts', () => {
  it('builds parts from text, or from targeted parts, at read time', () => {
    expect(toParts('One. Two.')).toEqual([{ text: 'One.' }, { text: 'Two.' }]);
    expect(
      toParts(() => [{ text: 'Today. Walk at 7.', target: 'today' }, { text: 'Tap Help.' }]),
    ).toEqual([
      { text: 'Today.', target: 'today' },
      { text: 'Walk at 7.', target: 'today' },
      { text: 'Tap Help.' },
    ]);
  });
});
