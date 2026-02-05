// Spam Protection Utility

// Rate limiting - track last action times
const lastActionTimes = new Map();
const recentContent = new Map();

// Cooldown periods (in milliseconds)
export const COOLDOWNS = {
  COMMENT: 5000, // 5 seconds between comments
  NOTE: 30000, // 30 seconds between notes (already in App.jsx)
  DUPLICATE: 60000, // 1 minute before same content allowed
};

// Spam patterns to detect - only URLs/links
const SPAM_PATTERNS = [
  /https?:\/\/[^\s]+/i, // URLs
  /www\.[^\s]+/i, // www links
  /[^\s]+\.(com|net|org|io|co|xyz|link|click)\b/i, // Common domains
];

// Check if content is spammy
export const isSpamContent = (content) => {
  if (!content || typeof content !== "string") return false;

  const trimmed = content.trim();

  // Too short
  if (trimmed.length < 1) return true;

  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  return false;
};

// Get spam reason for user feedback
export const getSpamReason = (content) => {
  if (!content || content.trim().length < 1) {
    return "Content is empty";
  }

  const trimmed = content.trim();

  // Only check for links
  if (/https?:\/\/[^\s]+/i.test(trimmed)) {
    return "Links are not allowed";
  }

  if (/www\.[^\s]+/i.test(trimmed)) {
    return "Links are not allowed";
  }

  if (/[^\s]+\.(com|net|org|io|co|xyz|link|click)\b/i.test(trimmed)) {
    return "Links are not allowed";
  }

  return null;
};

// Check rate limit - returns { allowed: boolean, waitTime: number }
export const checkRateLimit = (userId, actionType) => {
  const key = `${userId}-${actionType}`;
  const now = Date.now();
  const lastTime = lastActionTimes.get(key) || 0;
  const cooldown = COOLDOWNS[actionType] || 5000;

  const timePassed = now - lastTime;

  if (timePassed < cooldown) {
    return {
      allowed: false,
      waitTime: Math.ceil((cooldown - timePassed) / 1000),
    };
  }

  return { allowed: true, waitTime: 0 };
};

// Record an action for rate limiting
export const recordAction = (userId, actionType) => {
  const key = `${userId}-${actionType}`;
  lastActionTimes.set(key, Date.now());
};

// Check for duplicate content - returns { isDuplicate: boolean }
export const checkDuplicate = (userId, content) => {
  const key = `${userId}-content`;
  const now = Date.now();
  const recent = recentContent.get(key) || [];

  // Clean old entries
  const validRecent = recent.filter(
    (entry) => now - entry.time < COOLDOWNS.DUPLICATE,
  );

  // Check if same content was posted recently
  const normalizedContent = content.toLowerCase().trim();
  const isDuplicate = validRecent.some(
    (entry) => entry.content === normalizedContent,
  );

  // Update recent content
  recentContent.set(key, validRecent);

  return { isDuplicate };
};

// Record content for duplicate detection
export const recordContent = (userId, content) => {
  const key = `${userId}-content`;
  const now = Date.now();
  const recent = recentContent.get(key) || [];

  // Add new content
  recent.push({
    content: content.toLowerCase().trim(),
    time: now,
  });

  // Keep only last 10 entries
  if (recent.length > 10) {
    recent.shift();
  }

  recentContent.set(key, recent);
};

// Full spam check - returns { allowed: boolean, reason: string | null }
export const fullSpamCheck = (userId, content, actionType = "COMMENT") => {
  // Check rate limit
  const rateCheck = checkRateLimit(userId, actionType);
  if (!rateCheck.allowed) {
    return {
      allowed: false,
      reason: `Wait ${rateCheck.waitTime}s before posting again`,
    };
  }

  // Check for spam content
  const spamReason = getSpamReason(content);
  if (spamReason) {
    return {
      allowed: false,
      reason: spamReason,
    };
  }

  // Check for duplicates
  const dupCheck = checkDuplicate(userId, content);
  if (dupCheck.isDuplicate) {
    return {
      allowed: false,
      reason: "You already posted this",
    };
  }

  return { allowed: true, reason: null };
};

// Record successful post
export const recordSuccessfulPost = (
  userId,
  content,
  actionType = "COMMENT",
) => {
  recordAction(userId, actionType);
  recordContent(userId, content);
};
