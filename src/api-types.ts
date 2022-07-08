/* eslint-disable no-redeclare */
import { Array, Number, String, Record, Static, Dictionary, Optional } from 'runtypes';

// metric query types
const MetricQueryData = Record({
  id: Number,
  timestamp: String,
  value: Number
});

const Metric = Record({
  name: String,
  resource_name: String,
  timestamps: Array(Number),
  values: Array(Number)
});

const GroupInfo = Record({ group: String, name: String, value: String });

export const MetricQuery = Record({
  group_infos: Array(GroupInfo),
  metric: Metric
});

export const MetricQueries = Dictionary(Array(MetricQuery), 'string');

export const ExecuteMetricQueriesPartial = Record({
  metric_query: Array(MetricQuery)
});

export type GroupInfo = Static<typeof GroupInfo>;
export type ExecuteMetricQueriesPartial = Static<typeof ExecuteMetricQueriesPartial>;
export type MetricQuery = Static<typeof MetricQuery>;
export type Metric = Static<typeof Metric>;
export type MetricQueryData = Static<typeof MetricQueryData>;
export type MetricQueries = Static<typeof MetricQueries>;

// resource query types
export const ResourceTag = Object({
  key: String,
  value: String
});

export const Resource = Object({
  id: Number,
  attributes: Optional(Array(Object({ key: String, value: String }))),
  name: String,
  type: String,
  tags: Array(ResourceTag),
  tagsByKey: Optional(Dictionary(Record({ key: String, value: String }))),
  hostId: Optional(String.Or(Number)),
  podId: Optional(String.Or(Number)),
  containerId: Optional(String.Or(Number)),
  parentIds: Optional(Array(String))
});

export const ResourceIdMap = Dictionary(Optional(Resource), 'number');

export type ResourceTag = Static<typeof ResourceTag>;
export type Resource = Static<typeof Resource>;
export type ResourceIdMap = Static<typeof ResourceIdMap>;

export const Resources = Array(Resource);

export const ExecuteResourcesPartial = Object({
  resources: Resources
});

export type ExecuteResourcesPartial = Static<typeof ExecuteResourcesPartial>;
export type Resources = Static<typeof Resources>;

// event query types
export const EventItem = Object({
  id: Number,
  hostId: String,
  resourceId: String,
  resourceName: String,
  resourceType: String,
  alarmName: String,
  alarmDescription: String,
  actionName: String,
  actionDescription: String,
  botName: String,
  botDescription: String,
  status: String,
  stepTypes: Array(String),
  timestamps: Array(String)
});

export const Step = Object({
  stepType: String,
  timestamp: Number
});

export const AnnotationListItem = Object({
  resourceData: Object({
    hostId: String,
    resourceId: String,
    resourceName: String,
    resourceType: String
  }),
  alarm: Object({
    name: String,
    description: String
  }),
  bot: Object({
    name: String,
    description: String
  }),
  action: Object({
    name: String,
    description: String
  }),
  status: String,
  steps: Array(Step)
});

export const ExecuteEventsPartial = Object({
  annotationQueryRollup: Object({
    annotationList: Array(AnnotationListItem),
    listTotalCount: Number,
    listCounters: Object({
      groups: Array(
        Object({
          counters: Array(
            Object({
              count: Number,
              name: String
            })
          )
        })
      )
    })
  })
});

export type Step = Static<typeof Step>;
export type EventItem = Static<typeof EventItem>;
export type ExecuteEventsPartial = Static<typeof ExecuteEventsPartial>;
export type AnnotationListItem = Static<typeof AnnotationListItem>;

// list symbol types
export const ListAttributes = Object({
  name: String,
  attributes: Object({
    type: String,
    name: String,
    enabled: String,
    resourceQuery: String
  })
});

export const ExecuteListPartial = Object({
  listType: Object({
    symbol: Array(ListAttributes)
  }),
  type: String
});

export type ListAttributes = Static<typeof ListAttributes>;
export type ExecuteListPartial = Static<typeof ExecuteListPartial>;
