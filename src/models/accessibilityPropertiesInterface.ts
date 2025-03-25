import { UserGroupEnum } from "./userGroupEnum";
import { UserFeatureEnum } from "./userFeatureEnum";

export interface AccessibilityPropertiesInterface {
  hasCorrectProperties: (feature: GeoJSON.Feature<any, any>) => boolean;
  msgTrue: string | ((feature: GeoJSON.Feature<any, any>) => string);
  msgFalse: string | ((feature: GeoJSON.Feature<any, any>) => string) | null;
  userGroups: UserGroupEnum[];
  iconFilename?: string;
  tags?: UserFeatureEnum[];
}
