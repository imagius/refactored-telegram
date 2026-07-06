import { describe, it, expect } from 'vitest';
import { titleCaseName } from './titleCase';

describe('titleCaseName', () => {
  it('capitalizes each word', () => {
    expect(titleCaseName('Burner mining drill')).toBe('Burner Mining Drill');
  });

  it('handles hyphenated words', () => {
    expect(titleCaseName('Long-handed inserter')).toBe('Long-Handed Inserter');
  });

  it('preserves numbers', () => {
    expect(titleCaseName('Assembling machine 1')).toBe('Assembling Machine 1');
    expect(titleCaseName('Speed module 3')).toBe('Speed Module 3');
  });

  it('keeps short connecting words lowercase (except first word)', () => {
    expect(titleCaseName('Pipe to ground')).toBe('Pipe to Ground');
  });

  it('capitalizes the first word even if it is a connecting word', () => {
    expect(titleCaseName('the great machine')).toBe('The Great Machine');
  });

  it('handles single word', () => {
    expect(titleCaseName('Boiler')).toBe('Boiler');
    expect(titleCaseName('pumpjack')).toBe('Pumpjack');
  });

  it('handles empty string', () => {
    expect(titleCaseName('')).toBe('');
  });

  it('handles already-title-cased names', () => {
    expect(titleCaseName('Nuclear Reactor')).toBe('Nuclear Reactor');
  });

  it('handles all caps', () => {
    expect(titleCaseName('NUCLEAR REACTOR')).toBe('Nuclear Reactor');
  });

  it('handles mixed case', () => {
    expect(titleCaseName('eLeCtRiC mInInG dRiLl')).toBe('Electric Mining Drill');
  });

  it('handles multiple hyphens', () => {
    expect(titleCaseName('fast-transport-belt')).toBe('Fast-Transport-Belt');
  });

  it('handles rail-chain-signal', () => {
    expect(titleCaseName('Rail chain signal')).toBe('Rail Chain Signal');
  });

  it('handles active-provider-chest', () => {
    expect(titleCaseName('Active provider chest')).toBe('Active Provider Chest');
  });
});