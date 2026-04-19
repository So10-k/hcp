import { Composition } from "remotion";
import { SideQuestAdReel } from "./SideQuestAdReel";
import { SideQuestFeatureReel } from "./SideQuestFeatureReel";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="sidequest-ad"
        component={SideQuestAdReel}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
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
