'use client';

import ComponentCard from '@/components/common/ComponentCard';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
// import { Avatar } from "@verifactu/ui"; // TODO: Create Avatar component

// Temporary placeholder until Avatar is implemented
const Avatar = ({ src, size, status }: any) => {
  const sizeMap: any = {
    xsmall: 'w-8 h-8',
    small: 'w-10 h-10',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
    xlarge: 'w-20 h-20',
  };
  return <img src={src} className={`rounded-full ${sizeMap[size] || 'w-12 h-12'}`} alt="Avatar" />;
};

export default function AvatarPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Avatar" />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="Default Avatar">
          {/* Default Avatar (No Status) */}
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar src="/images/user/user-01.jpg" size="xsmall" />
            <Avatar src="/images/user/user-01.jpg" size="small" />
            <Avatar src="/images/user/user-01.jpg" size="medium" />
            <Avatar src="/images/user/user-01.jpg" size="large" />
            <Avatar src="/images/user/user-01.jpg" size="xlarge" />
            <Avatar src="/images/user/user-01.jpg" size="xxlarge" />
          </div>
        </ComponentCard>
        <ComponentCard title="Avatar with online indicator">
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar src="/images/user/user-01.jpg" size="xsmall" status="online" />
            <Avatar src="/images/user/user-01.jpg" size="small" status="online" />
            <Avatar src="/images/user/user-01.jpg" size="medium" status="online" />
            <Avatar src="/images/user/user-01.jpg" size="large" status="online" />
            <Avatar src="/images/user/user-01.jpg" size="xlarge" status="online" />
            <Avatar src="/images/user/user-01.jpg" size="xxlarge" status="online" />
          </div>
        </ComponentCard>
        <ComponentCard title="Avatar with Offline indicator">
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar src="/images/user/user-01.jpg" size="xsmall" status="offline" />
            <Avatar src="/images/user/user-01.jpg" size="small" status="offline" />
            <Avatar src="/images/user/user-01.jpg" size="medium" status="offline" />
            <Avatar src="/images/user/user-01.jpg" size="large" status="offline" />
            <Avatar src="/images/user/user-01.jpg" size="xlarge" status="offline" />
            <Avatar src="/images/user/user-01.jpg" size="xxlarge" status="offline" />
          </div>
        </ComponentCard>{' '}
        <ComponentCard title="Avatar with busy indicator">
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar src="/images/user/user-01.jpg" size="xsmall" status="busy" />
            <Avatar src="/images/user/user-01.jpg" size="small" status="busy" />
            <Avatar src="/images/user/user-01.jpg" size="medium" status="busy" />
            <Avatar src="/images/user/user-01.jpg" size="large" status="busy" />
            <Avatar src="/images/user/user-01.jpg" size="xlarge" status="busy" />
            <Avatar src="/images/user/user-01.jpg" size="xxlarge" status="busy" />
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
