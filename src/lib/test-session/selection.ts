export type TopicAllocationInput = {
  topicId: string;
  weightPercent: number;
};

export type TopicAllocation = {
  alloc: number;
  topicId: string;
};

export type DifficultyAllocation = {
  easy: number;
  hard: number;
  medium: number;
};

export function computeTopicAllocations(
  topics: TopicAllocationInput[],
  count: number
): TopicAllocation[] {
  if (!Number.isInteger(count) || count <= 0) {
    return [];
  }

  const rankedTopics = topics
    .map((topic, index) => ({
      index,
      topicId: topic.topicId,
      weightPercent: Number.isFinite(topic.weightPercent) ? Math.max(0, topic.weightPercent) : 0
    }))
    .filter((topic) => topic.topicId && topic.weightPercent > 0)
    .sort((left, right) => right.weightPercent - left.weightPercent || left.index - right.index);

  if (!rankedTopics.length) {
    return [];
  }

  const allocations = rankedTopics.map((topic) => ({
    alloc: Math.floor((count * topic.weightPercent) / 100),
    topicId: topic.topicId
  }));

  let allocated = allocations.reduce((sum, topic) => sum + topic.alloc, 0);
  let cursor = 0;

  while (allocated < count) {
    allocations[cursor % allocations.length].alloc += 1;
    allocated += 1;
    cursor += 1;
  }

  cursor = allocations.length - 1;

  while (allocated > count && allocations.some((topic) => topic.alloc > 0)) {
    const topic = allocations[cursor % allocations.length];

    if (topic.alloc > 0) {
      topic.alloc -= 1;
      allocated -= 1;
    }

    cursor = cursor === 0 ? allocations.length - 1 : cursor - 1;
  }

  return allocations.filter((topic) => topic.alloc > 0);
}

export function computeDifficultyAllocations(count: number): DifficultyAllocation {
  if (!Number.isInteger(count) || count <= 0) {
    return { easy: 0, hard: 0, medium: 0 };
  }

  const easy = Math.floor(count * 0.3);
  const hard = Math.floor(count * 0.3);
  const medium = count - easy - hard;

  return { easy, hard, medium };
}
