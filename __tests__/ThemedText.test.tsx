import * as React from 'react';
import { render } from '@testing-library/react-native';
import { ThemedText } from '../components/themed-text';

// Mock the hook used in ThemedText
jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: () => '#000000',
}));

describe('ThemedText', () => {
  it('renders correctly with default type', () => {
    const { getByText } = render(<ThemedText>Hello Test</ThemedText>);
    expect(getByText('Hello Test')).toBeTruthy();
  });

  it('applies correct styles for title type', () => {
    const { getByText } = render(<ThemedText type="title">Title Text</ThemedText>);
    const textElement = getByText('Title Text');
    expect(textElement.props.style).toContainEqual({ fontSize: 32, fontWeight: 'bold', lineHeight: 32 });
  });
});
