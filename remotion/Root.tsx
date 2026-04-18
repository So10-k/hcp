import { Composition } from "remotion";
import { SideQuestFeatureReel } from "./SideQuestFeatureReel";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="sidequest-create-reel"
        component={SideQuestFeatureReel}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ variant: "create" as const }}
      />
      <Composition
        id="sidequest-party-reel"
        component={SideQuestFeatureReel}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ variant: "party" as const }}
      />
      <Composition
        id="sidequest-reward-reel"
        component={SideQuestFeatureReel}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ variant: "rewards" as const }}
      />
    </>
  );
}
