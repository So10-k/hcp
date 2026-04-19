import { Composition } from "remotion";
import { SideQuestAdReel } from "./SideQuestAdReel";
import { SideQuestFeatureReel } from "./SideQuestFeatureReel";
import { SideQuestBoardTutorialReel } from "./SideQuestBoardTutorialReel";
import { SideQuestHighRollerTutorialReel } from "./SideQuestHighRollerTutorialReel";
import { SideQuestIntroReel } from "./SideQuestIntroReel";
import { SideQuestMorphLoop } from "./SideQuestMorphLoop";
import { SideQuestSpringLoudReel } from "./SideQuestSpringLoudReel";
import { SideQuestSpringReel } from "./SideQuestSpringReel";
import { SideQuestTutorialReel } from "./SideQuestTutorialReel";

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
        id="sidequest-spring"
        component={SideQuestSpringReel}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="sidequest-spring-loud"
        component={SideQuestSpringLoudReel}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="sidequest-tutorial"
        component={SideQuestTutorialReel}
        durationInFrames={750}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="sidequest-board-tutorial"
        component={SideQuestBoardTutorialReel}
        durationInFrames={750}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="sidequest-highroller-tutorial"
        component={SideQuestHighRollerTutorialReel}
        durationInFrames={750}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="sidequest-intro"
        component={SideQuestIntroReel}
        durationInFrames={750}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="sidequest-morph"
        component={SideQuestMorphLoop}
        durationInFrames={150}
        fps={30}
        width={720}
        height={720}
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
