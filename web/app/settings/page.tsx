'use client';

import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { ExtensionConnect } from '@/components/ui/ExtensionConnect';
import { DomainManagement } from '@/components/settings/DomainManagement';
import { useState, useRef } from 'react';
import { uploadProfilePicture, deleteProfilePicture } from '@/lib/apiClient';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const profilePictureUrl = user?.profilePictureUrl 
    ? (user.profilePictureUrl.startsWith('http') ? user.profilePictureUrl : `${API_BASE_URL}${user.profilePictureUrl}`)
    : null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    setError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const result = await uploadProfilePicture(file);
      if (refreshUser) {
        await refreshUser();
      }
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Refresh the page to update dashboard and other components
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await deleteProfilePicture();
      if (refreshUser) {
        await refreshUser();
      }
      setPreview(null);
      // Refresh the page to update dashboard and other components
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      <div className="space-y-6">
        {/* Extension Section - Moved to top for visibility */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Browser Extension</h2>
          <p className="text-sm text-slate-600 mb-4">
            Connect your Chrome extension to automatically sync focus sessions.
          </p>
          <ExtensionConnect />
        </div>

        {/* Profile Section */}
        <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Profile</h3>
          <div className="space-y-6">
            {/* Profile Picture */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Profile Picture
              </label>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {(preview || profilePictureUrl) ? (
                    <img
                      src={preview || profilePictureUrl || ''}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-2 border-slate-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center border-2 border-slate-300">
                      <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="profile-picture-input"
                    />
                    <label
                      htmlFor="profile-picture-input"
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {profilePictureUrl ? 'Change Picture' : 'Upload Picture'}
                    </label>
                    {preview && (
                      <>
                        <button
                          onClick={handleUpload}
                          disabled={uploading}
                          className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploading ? 'Uploading...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={uploading}
                          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {profilePictureUrl && !preview && (
                      <button
                        onClick={handleDelete}
                        disabled={uploading}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploading ? 'Removing...' : 'Remove'}
                      </button>
                    )}
                  </div>
                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    JPG, PNG, GIF or WebP. Max size 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
              />
              <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
            </div>
          </div>
        </div>

        {/* Domain Management Section */}
        <DomainManagement />

        {/* Privacy Section */}
        <div className="rounded-2xl bg-white shadow-sm p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Privacy</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">Show sessions on feed</div>
                <div className="text-sm text-slate-600">Allow your sessions to appear in the public feed</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

