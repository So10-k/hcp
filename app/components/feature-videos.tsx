"use client";

import { Player } from "@remotion/player";
import { SideQuestFeatureReel, type FeatureReelVariant } from "../../remotion/SideQuestFeatureReel";

const reels: Array<{
  id: FeatureReelVariant;
  title: string;
  note: string;
}> = [
  {
    id: "create",
    title: "Make it a quest",
    note: "Task in. Mission out."
  },
  {
    id: "party",
    title: "Squad check",
    note: "Private progress, no clout chase."
  },
  {
    id: "rewards",
    title: "Clear screen",
    note: "Stickers. Streaks. Boom."
  }
];

export default function FeatureVideos() {
  return (
    <section className="feature-reels" aria-labelledby="feature-reels-title">
      <div className="feature-reels-heading">
        <p className="eyebrow">Five-second reels</p>
        <h2 id="feature-reels-title">Tap in. See the loop.</h2>
      </div>

      <div className="reel-grid">
        {reels.map((reel) => (
          <article className="reel-card" key={reel.id}>
            <div className="reel-player">
              <Player
                component={SideQuestFeatureReel}
                durationInFrames={150}
                fps={30}
                compositionWidth={1280}
                compositionHeight={720}
                inputProps={{ variant: reel.id }}
                loop
                autoPlay
                initiallyMuted
                controls={false}
                acknowledgeRemotionLicense
                style={{
                  width: "100%",
                  height: "100%"
                }}
              />
            </div>
            <h3>{reel.title}</h3>
            <p>{reel.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
