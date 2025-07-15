import React from 'react';
import { render, screen } from '@testing-library/react';
import Avatar from './Avatar';

describe('Avatar Component', () => {
  test('renders user initials when no profile photo is provided', () => {
    render(
      <Avatar 
        firstName="John"
        lastName="Doe"
        size="medium"
      />
    );
    
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  test('renders profile image when valid URL is provided', () => {
    const testImageUrl = 'https://example.com/test-image.jpg';
    render(
      <Avatar 
        src={testImageUrl}
        firstName="John"
        lastName="Doe"
        size="medium"
      />
    );
    
    const img = screen.getByAltText('User Avatar');
    expect(img).toBeInTheDocument();
    expect(img.src).toBe(testImageUrl);
  });

  test('renders initials when empty string is provided as src', () => {
    render(
      <Avatar 
        src=""
        firstName="Jane"
        lastName="Smith"
        size="medium"
      />
    );
    
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  test('renders initials when default avatar URL is provided', () => {
    render(
      <Avatar 
        src="https://realoffer-bucket.s3.us-east-2.amazonaws.com/avatar.svg"
        firstName="Bob"
        lastName="Johnson"
        size="medium"
      />
    );
    
    expect(screen.getByText('BJ')).toBeInTheDocument();
  });

  test('renders question mark when no name is provided', () => {
    render(
      <Avatar 
        size="medium"
      />
    );
    
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  test('applies correct size class', () => {
    render(
      <Avatar 
        firstName="John"
        lastName="Doe"
        size="large"
      />
    );
    
    const avatarElement = screen.getByText('JD').closest('div');
    expect(avatarElement).toHaveClass('avatar-large');
  });
}); 