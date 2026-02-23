import { PDFDocument, StandardFonts, EncryptionAlgorithm } from "pdf-lib";

/**
 * Permission flags for PDF protection
 */
export interface PDFPermissions {
  /** Allow printing the document */
  printing: boolean;
  /** Allow copying text and graphics */
  copying: boolean;
  /** Allow modifying the document content */
  modifying: boolean;
  /** Allow annotating the document */
  annotating: boolean;
}

/**
 * Default permissions (all allowed)
 */
export const defaultPermissions: PDFPermissions = {
  printing: true,
  copying: true,
  modifying: false,
  annotating: false,
};

/**
 * Password strength levels
 */
export type PasswordStrength = "weak" | "medium" | "strong";

/**
 * Analyzes password strength
 * @param password - The password to analyze
 * @returns PasswordStrength level
 */
export function analyzePasswordStrength(password: string): PasswordStrength {
  if (!password) return "weak";

  let score = 0;

  // Length checks
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Character variety checks
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Common patterns to penalize
  if (/(.)\1{2,}/.test(password)) score--; // Repeated characters
  if (/^[a-z]+$/.test(password)) score--; // Only lowercase
  if (/^[0-9]+$/.test(password)) score--; // Only numbers

  if (score <= 2) return "weak";
  if (score <= 4) return "medium";
  return "strong";
}

/**
 * Gets a human-readable description of password strength
 * @param strength - The password strength level
 * @returns Description string
 */
export function getPasswordStrengthDescription(
  strength: PasswordStrength
): string {
  switch (strength) {
    case "weak":
      return "Weak - Add more characters, numbers, and symbols";
    case "medium":
      return "Medium - Consider using a longer password";
    case "strong":
      return "Strong - Good password strength";
    default:
      return "";
  }
}

/**
 * Validation result for password
 */
export interface PasswordValidation {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a password
 * @param password - The password to validate
 * @returns Validation result
 */
export function validatePassword(password: string): PasswordValidation {
  if (!password) {
    return { isValid: false, error: "Password is required" };
  }

  if (password.length < 4) {
    return { isValid: false, error: "Password must be at least 4 characters" };
  }

  if (password.length > 100) {
    return { isValid: false, error: "Password must be less than 100 characters" };
  }

  return { isValid: true };
}

/**
 * Validates that password and confirm password match
 * @param password - The password
 * @param confirmPassword - The confirmation password
 * @returns Validation result
 */
export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): PasswordValidation {
  if (password !== confirmPassword) {
    return { isValid: false, error: "Passwords do not match" };
  }
  return { isValid: true };
}

/**
 * Options for PDF protection
 */
export interface ProtectPDFOptions {
  /** User password (required to open the PDF) */
  userPassword: string;
  /** Owner password (required to change permissions) */
  ownerPassword: string;
  /** Permission settings */
  permissions: PDFPermissions;
  /** Use AES-256 encryption (if supported) */
  useAES256?: boolean;
}

/**
 * Protects a PDF with password encryption and permissions
 * 
 * @param file - The PDF file to protect (File object from browser)
 * @param options - Protection options
 * @returns Promise<Blob> - The protected PDF as a Blob
 * 
 * @example
 * ```typescript
 * const file = new File([pdfData], "document.pdf", { type: "application/pdf" });
 * const result = await protectPDF(file, {
 *   userPassword: "user123",
 *   ownerPassword: "owner123",
 *   permissions: {
 *     printing: true,
 *     copying: false,
 *     modifying: false,
 *     annotating: false,
 *   },
 * });
 * ```
 */
export async function protectPDF(
  file: File,
  options: ProtectPDFOptions
): Promise<Blob> {
  // Validate inputs
  const passwordValidation = validatePassword(options.userPassword);
  if (!passwordValidation.isValid) {
    throw new Error(`User password: ${passwordValidation.error}`);
  }

  const ownerValidation = validatePassword(options.ownerPassword);
  if (!ownerValidation.isValid) {
    throw new Error(`Owner password: ${ownerValidation.error}`);
  }

  // Read the input file
  const arrayBuffer = await file.arrayBuffer();
  
  // Load the PDF document
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  // Get the number of pages for metadata
  const pageCount = pdfDoc.getPageCount();

  // Configure permissions based on options
  const pdfPermissions = {
    // Owner permissions (always full)
    annotating: true,
    copying: true,
    modifying: true,
    printing: true,
    // User permissions from options
    userAccessibleCopy: options.permissions.copying,
    userAccessiblePrint: options.permissions.printing,
    userAnnotating: options.permissions.annotating,
    userModifying: options.permissions.modifying,
  };

  // Encrypt the PDF
  // Use AES-256 if available, otherwise fall back to AES-128
  const encryptionAlgorithm = options.useAES256 
    ? EncryptionAlgorithm.AES256 
    : EncryptionAlgorithm.AES128;

  await pdfDoc.encrypt({
    userPassword: options.userPassword,
    ownerPassword: options.ownerPassword,
    permissions: pdfPermissions,
    encryptionAlgorithm,
  });

  // Save the protected PDF
  const protectedPdfBytes = await pdfDoc.save();

  // Return as Blob
  return new Blob([protectedPdfBytes], { type: "application/pdf" });
}

/**
 * Generates a filename for the protected PDF
 * @param originalFileName - The original PDF filename
 * @returns Protected filename
 */
export function generateProtectedFileName(originalFileName: string): string {
  const baseName = originalFileName.replace(/\.pdf$/i, "");
  return `${baseName}_protected.pdf`;
}

/**
 * Checks if a PDF is already encrypted
 * @param file - The PDF file to check
 * @returns Promise<boolean> - True if already encrypted
 */
export async function isPDFEncrypted(file: File): Promise<boolean> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: false,
    });
    // If we can load without password and encryption is present
    return pdfDoc.isEncrypted;
  } catch {
    // If loading fails, it might be encrypted
    return true;
  }
}
