/**
 * @jest-environment jsdom
 */

import { translate } from '../../src/utils/translate';

// Optional: Mock LanguageService and lang if needed
jest.mock('../../src/services/languageService', () => ({
  __esModule: true,
  default: {
    getCurrentLanguageAcronym: jest.fn(() => 'en'),
  },
  lang: {
    profileQuickSwitchHeader: 'Profiles',
    settingsHeader: 'Settings',
    languageHeader: 'Languages',
    switch2DButton: '2D Mode',
    switchWheelchairModeButton: 'Wheelchair Mode',
    saveButton: 'Save',
    closeButton: 'Close',
  },
}));

describe('translate()', () => {
  beforeEach(() => {
    // Set up DOM elements that translate() expects
    document.body.innerHTML = `
      <ul id="userProfileList"></ul>
      <ul id="userSettingsList"></ul>
      <ul id="languageList"></ul>
      <button id="switch2DLabel"></button>
      <button id="switchWheelchairMode"></button>
      <button class="saveButton"></button>
      <button class="closeButton"></button>
    `;
  });

  it('sets the lang attribute on <html>', () => {
    translate();
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });

  it('updates aria-labels and titles', () => {
    translate();
    expect(document.getElementById('userProfileList')?.ariaLabel).toBe('Profiles');
    expect(document.getElementById('switch2DLabel')?.title).toBe('2D Mode');
    expect(document.getElementById('switch2DLabel')?.ariaLabel).toBe('2D Mode');
  });

  it('updates button text content by class', () => {
    translate();
    const save = document.querySelector('.saveButton') as HTMLElement;
    const close = document.querySelector('.closeButton') as HTMLElement;
    expect(save.textContent).toBe('Save');
    expect(close.textContent).toBe('Close');
  });
});
