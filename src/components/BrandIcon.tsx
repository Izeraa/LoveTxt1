import React, { useState } from 'react';
import { FileText } from 'lucide-react';

export const LOVETXT_ICON_SRC = '/lovetxt-icon.png';

interface BrandIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<BrandIconProps['size']>, string> = {
  xs: 'h-5 w-5 rounded-[5px]',
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-10 w-10 rounded-xl',
  lg: 'h-16 w-16 rounded-2xl',
};

export const BrandIcon: React.FC<BrandIconProps> = ({
  size = 'sm',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center bg-rose-600 text-white ${SIZE_CLASSES[size]} ${className}`}
      >
        <FileText className="h-1/2 w-1/2" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${SIZE_CLASSES[size]} ${className}`}
    >
      <img
        src={LOVETXT_ICON_SRC}
        alt="loveTxt"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full scale-[1.08] object-cover"
      />
    </span>
  );
};
