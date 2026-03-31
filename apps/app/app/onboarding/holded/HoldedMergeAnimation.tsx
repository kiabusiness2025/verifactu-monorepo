'use client';

import Image from 'next/image';
import styles from './loading.module.css';

type Props = {
  compact?: boolean;
};

export default function HoldedMergeAnimation({ compact = false }: Props) {
  return (
    <div className="flex justify-center" aria-hidden="true">
      <div className={`${styles.mergeStage} ${compact ? 'scale-[0.86]' : ''}`}>
        <div className={styles.glow} />

        <div className={`${styles.iconOrbit} ${styles.leftOrbit}`}>
          <div className={styles.chatgptBadge}>ChatGPT</div>
        </div>

        <div className={`${styles.iconOrbit} ${styles.rightOrbit}`}>
          <Image
            src="/brand/holded/holded-diamond-logo.png"
            alt="Holded"
            width={30}
            height={30}
            className="h-7 w-7 object-contain"
            priority
          />
        </div>

        <div className={styles.centerPulse}>
          <Image
            src="/brand/holded/holded-diamond-logo.png"
            alt="Holded conectado con ChatGPT"
            width={40}
            height={40}
            className="h-9 w-9 object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}
