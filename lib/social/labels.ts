/** Человекочитаемые названия площадок (без серверных зависимостей). */

import type { SourceId } from "./types";

export const sourceLabels: Record<SourceId, string> = {
  "2gis": "2ГИС",
  yandex: "Яндекс Карты",
  vk: "ВКонтакте",
};

export const sourceShort: Record<SourceId, string> = {
  "2gis": "2ГИС",
  yandex: "Яндекс",
  vk: "VK",
};

export const sourceOrder: SourceId[] = ["2gis", "yandex", "vk"];
