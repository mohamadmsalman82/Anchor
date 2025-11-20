'use client';

import { useAuth } from '@/hooks/useAuth';
import { ExtensionConnect } from '@/components/ui/ExtensionConnect';
import { DomainManagement } from '@/components/settings/DomainManagement';
import { useState, useRef } from 'react';
import { uploadProfilePicture, deleteProfilePicture } from '@/lib/apiClient';
import { useRouter } from 'next/navigation';
import { AnchorCard } from '@/components/ui/AnchorCard';

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
    <div className="space-y-8 pb-24 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Control Center</h1>
        <p className="text-slate-500">Customize your Anchor experience.</p>
      </div>

      <div className="space-y-6">
        {/* Extension Section - High Priority */}
        <AnchorCard title="Browser Extension" subtitle="Connect to track your sessions">
          <div className="bg-slate-50 rounded-xl p-1">
            <ExtensionConnect />
          </div>
        </AnchorCard>

        {/* Profile Section */}
        <AnchorCard title="Profile Identity" subtitle="How you appear in the harbor">
           <div className="space-y-8">
            {/* Profile Picture */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                Profile Picture
              </label>
              <div className="flex items-center gap-8">
                <div className="relative group shrink-0">
                  {(preview || profilePictureUrl) ? (
                    <img
                      src={preview || profilePictureUrl || ''}
                      alt="Profile"
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-lg group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border-2 border-white shadow-inner text-3xl font-bold text-slate-400">
                      {user?.firstName?.[0] || user?.email?.[0]}
                    </div>
                  )}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-md border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="profile-picture-input"
                    />
                    
                    {preview ? (
                      <>
                        <button
                          onClick={handleUpload}
                          disabled={uploading}
                          className="px-5 py-2.5 text-sm font-bold text-white bg-teal-500 rounded-xl hover:bg-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/30 hover:shadow-teal-500/40"
                        >
                          {uploading ? 'Uploading...' : 'Confirm Change'}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={uploading}
                          className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                      >
                        {profilePictureUrl ? 'Change Picture' : 'Upload Picture'}
                      </button>
                    )}
                    
                    {profilePictureUrl && !preview && (
                      <button
                        onClick={handleDelete}
                        disabled={uploading}
                        className="px-5 py-2.5 text-sm font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  {error && (
                    <p className="text-sm text-rose-500 font-medium flex items-center gap-1 animate-in fade-in">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 font-medium">
                    Accepts JPG, PNG, or GIF. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="max-w-md">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative group">
                 <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-600 cursor-not-allowed font-mono text-sm"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>
           </div>
        </AnchorCard>

        {/* Domain Management Section */}
        <div className="pt-2">
           <DomainManagement />
        </div>

        {/* Privacy Section */}
        <AnchorCard title="Privacy & Visibility" subtitle="Manage who sees your progress">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-bold text-slate-900">Public Feed Visibility</div>
              <div className="text-sm text-slate-500 mt-1">Allow your sessions to inspire others in the feed.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer group">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all after:duration-300 peer-checked:bg-teal-500 shadow-inner"></div>
            </label>
          </div>
        </AnchorCard>
      </div>
    </div>
  );
}
