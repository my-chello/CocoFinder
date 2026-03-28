export function getReadableAuthErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return mapAuthMessage(error.message);
  }

  if (typeof error === 'string' && error.trim()) {
    return mapAuthMessage(error);
  }

  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>;
    const preferredMessage =
      candidate.message ??
      candidate.msg ??
      candidate.error_description ??
      candidate.error ??
      candidate.code;

    if (typeof preferredMessage === 'string' && preferredMessage.trim()) {
      return mapAuthMessage(preferredMessage);
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Authentication failed. Please try again.';
    }
  }

  return 'Authentication failed. Please try again.';
}

function mapAuthMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Incorrect email or password';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please verify your email address before logging in';
  }

  if (normalized.includes('user already registered')) {
    return 'An account with this email already exists';
  }

  if (normalized.includes('password should be at least')) {
    return 'Password must be at least 8 characters';
  }

  if (normalized.includes('unable to validate email address')) {
    return 'Please enter a valid email address';
  }

  if (normalized.includes('for security purposes')) {
    return 'Please wait a moment before trying again';
  }

  if (
    normalized.includes('email rate limit exceeded') ||
    normalized.includes('rate limit exceeded')
  ) {
    return 'Too many email attempts were made. Please wait a few minutes before trying again.';
  }

  return message;
}
