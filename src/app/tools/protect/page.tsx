"use client";

import { useState, useCallback, useMemo } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FileUploadZone } from "@/components/file-upload-zone";
import { Button } from "@/components/ui/button";
import { 
  protectPDF, 
  generateProtectedFileName,
  analyzePasswordStrength,
  getPasswordStrengthDescription,
  validatePassword,
  validatePasswordMatch,
  defaultPermissions,
  PasswordStrength,
  PDFPermissions,
  PasswordValidation
} from "@/lib/pdf-protect";
import { ProcessedFile }
import { UploadedFile } from "@/types/pdf";
import { 
  Shield, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  FileLock,
  Lock,
  Unlock,
  Copy,
  Edit,
  Printer,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";

export default function ProtectPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Password fields
  const [userPassword, setUserPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Visibility toggles
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Permissions
  const [permissions, setPermissions] = useState<PDFPermissions>(defaultPermissions);
  const [useAES256, setUseAES256] = useState(true);

  // Analyze password strengths
  const userPasswordStrength = useMemo<PasswordStrength>(
    () => analyzePasswordStrength(userPassword),
    [userPassword]
  );

  const ownerPasswordStrength = useMemo<PasswordStrength>(
    () => analyzePasswordStrength(ownerPassword),
    [ownerPassword]
  );

  // Validation states
  const userPasswordValid = useMemo(() => 
    validatePassword(userPassword), 
    [userPassword]
  );

  const confirmPasswordValid = useMemo(() => 
    validatePasswordMatch(userPassword, confirmPassword),
    [userPassword, confirmPassword]
  );

  const canProtect = useMemo(() => {
    return (
      file !== null &&
      userPasswordValid.isValid &&
      confirmPasswordValid.isValid &&
      status !== "processing"
    );
  }, [file, userPasswordValid, confirmPasswordValid, status]);

  // Handle file selection
  const handleFileSelect = useCallback((uploadedFiles: UploadedFile[]) => {
    if (files.length > 0) {
      setFile(uploadedFiles[0].file);
      setProcessedFile(null);
      setStatus("idle");
      setError(null);
    }
  }, []);

  // Handle file removal
  const handleFileRemove = useCallback(() => {
    setFile(null);
    setProcessedFile(null);
    setStatus("idle");
    setError(null);
  }, []);

  // Handle protection
  const handleProtect = useCallback(async () => {
    if (!file || !canProtect) return;

    setStatus("processing");
    setError(null);

    try {
      const blob = await protectPDF(file, {
        userPassword,
        ownerPassword: ownerPassword || userPassword, // Use user password if owner not set
        permissions,
        useAES256,
      });

      const url = URL.createObjectURL(blob);
      const filename = generateProtectedFileName(file.name);

      setProcessedFile({
        name: filename,
        blob,
        url,
      });
      setStatus("success");

      toast.success("PDF protected successfully!", {
        description: "Your PDF is now password protected",
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });

      // Auto-download
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setStatus("error");

      toast.error("Protection failed", {
        description: errorMessage,
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      });
    }
  }, [file, userPassword, ownerPassword, permissions, useAES256, canProtect]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!processedFile) return;
    
    const link = document.createElement("a");
    link.href = processedFile.url;
    link.download = processedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processedFile]);

  // Handle reset
  const handleReset = useCallback(() => {
    handleFileRemove();
    setUserPassword("");
    setOwnerPassword("");
    setConfirmPassword("");
    setPermissions(defaultPermissions);
  }, [handleFileRemove]);

  // Permission toggle handler
  const togglePermission = (key: keyof PDFPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Password strength meter component
  const PasswordStrengthMeter = ({ strength, label }: { strength: PasswordStrength; label?: string }) => {
    const colors = {
      weak: "bg-red-500",
      medium: "bg-yellow-500",
      strong: "bg-green-500",
    };

    const widths = {
      weak: "w-1/3",
      medium: "w-2/3",
      strong: "w-full",
    };

    return (
      <div className="mt-2">
        {label && (
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{label}</span>
            <span className={strength === "strong" ? "text-green-600" : strength === "medium" ? "text-yellow-600" : "text-red-600"}>
              {strength.charAt(0).toUpperCase() + strength.slice(1)}
            </span>
          </div>
        )}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full ${colors[strength]} ${widths[strength]} transition-all duration-300`}
          />
        </div>
      </div>
    );
  };

  // Password input component with visibility toggle
  const PasswordInput = ({
    value,
    onChange,
    placeholder,
    show,
    onToggle,
    isValid,
    error,
    strength
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    show: boolean;
    onToggle: () => void;
    isValid?: PasswordValidation;
    error?: string;
    strength?: PasswordStrength;
  }) => (
    <div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={status === "processing"}
          className={`w-full pr-10 px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 ${
            error || (isValid && !isValid.isValid) 
              ? "border-red-500 focus:border-red-500" 
              : "border-input"
          }`}
        />
        <button
          type="button"
          onClick={onToggle}
          disabled={status === "processing"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {strength && value && <PasswordStrengthMeter strength={strength} />}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );

  // Permission checkbox component
  const PermissionCheckbox = ({
    checked,
    onChange,
    icon,
    label,
    description,
    disabled
  }: {
    checked: boolean;
    onChange: () => void;
    icon: React.ReactNode;
    label: string;
    description: string;
    disabled?: boolean;
  }) => (
    <label className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
      checked 
        ? "border-primary bg-primary/5" 
        : "border-border hover:border-primary/50"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={checked ? "text-primary" : "text-muted-foreground"}>
            {icon}
          </span>
          <span className="font-medium text-sm">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </label>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Protect PDF</h1>
          <p className="text-muted-foreground">
            Add password protection and restrict permissions to your PDF
          </p>
        </div>

        {/* File upload */}
        {!processedFile && (
          <div className="mb-6">
            <FileUploadZone
              onFilesAdded={handleFileSelect}
              accept={{ "application/pdf": [".pdf"] }}
              maxFiles={1}
              disabled={status === "processing"}
            />
          </div>
        )}

        {/* Selected file */}
        {file && !processedFile && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileLock className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFileRemove}
                disabled={status === "processing"}
              >
                Remove
              </Button>
            </div>
          </div>
        )}

        {/* Password settings */}
        {file && !processedFile && (
          <div className="space-y-6">
            {/* Password fields */}
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password Settings
              </h3>

              <div className="space-y-4">
                {/* User Password */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    User Password <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Required to open the PDF
                  </p>
                  <PasswordInput
                    value={userPassword}
                    onChange={setUserPassword}
                    placeholder="Enter user password"
                    show={showUserPassword}
                    onToggle={() => setShowUserPassword(!showUserPassword)}
                    isValid={userPasswordValid}
                    error={!userPasswordValid.isValid ? userPasswordValid.error : undefined}
                    strength={userPasswordStrength}
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <PasswordInput
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Confirm user password"
                    show={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                    error={!confirmPasswordValid.isValid ? confirmPasswordValid.error : undefined}
                  />
                </div>

                {/* Owner Password (optional) */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Owner Password
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Required to change permissions (defaults to user password if empty)
                  </p>
                  <PasswordInput
                    value={ownerPassword}
                    onChange={setOwnerPassword}
                    placeholder="Enter owner password (optional)"
                    show={showOwnerPassword}
                    onToggle={() => setShowOwnerPassword(!showOwnerPassword)}
                    strength={ownerPasswordStrength}
                  />
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Unlock className="w-4 h-4" />
                Permissions
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PermissionCheckbox
                  checked={permissions.printing}
                  onChange={() => togglePermission("printing")}
                  icon={<Printer className="w-4 h-4" />}
                  label="Allow Printing"
                  description="Print the document"
                />
                <PermissionCheckbox
                  checked={permissions.copying}
                  onChange={() => togglePermission("copying")}
                  icon={<Copy className="w-4 h-4" />}
                  label="Allow Copying"
                  description="Copy text and graphics"
                />
                <PermissionCheckbox
                  checked={permissions.modifying}
                  onChange={() => togglePermission("modifying")}
                  icon={<Edit className="w-4 h-4" />}
                  label="Allow Modifying"
                  description="Edit content"
                />
                <PermissionCheckbox
                  checked={permissions.annotating}
                  onChange={() => togglePermission("annotating")}
                  icon={<MessageSquare className="w-4 h-4" />}
                  label="Allow Annotating"
                  description="Add comments and annotations"
                />
              </div>
            </div>

            {/* Encryption options */}
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Encryption
              </h3>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAES256}
                  onChange={(e) => setUseAES256(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-medium text-sm">Use AES-256 encryption</span>
                  <p className="text-xs text-muted-foreground">
                    Stronger encryption (may not work with older PDF readers)
                  </p>
                </div>
              </label>
            </div>

            {/* Protect button */}
            <div className="flex justify-center">
              <Button
                onClick={handleProtect}
                disabled={!canProtect || status === "processing"}
                size="lg"
                className="min-w-[200px]"
              >
                {status === "processing" ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Protecting...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Protect PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && status === "error" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success result */}
        {processedFile && status === "success" && (
          <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <h3 className="font-medium text-green-800">PDF Protected!</h3>
                  <p className="text-sm text-green-600">
                    {processedFile.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download Protected PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Protect Another
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
