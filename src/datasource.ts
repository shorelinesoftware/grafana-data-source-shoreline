import { v4 as uuidv4 } from 'uuid';

import {
  AnnotationEvent,
  AnnotationQueryRequest,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { getBackendSrv, getTemplateSrv } from '@grafana/runtime';

import { MyQuery, MyDataSourceOptions, MyVariableQuery } from './types';

export interface ShorelineQueryRequest {
  startTimeMs: number;
  endTimeMs: number;
  metricQuery: string;
  resourceQuery: string;
}

const execute_path = '/v1/execute';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  url?: string;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url;
  }

  buildOpStatement(options: DataQueryRequest<MyQuery>, query: MyQuery): string {
    if (query.custom) {
      if (query.customQueryText === '' || query.customQueryText === undefined) {
        throw new Error('Must provide an OpLang query');
      }
      return `${query.customQueryText} | from=${options.range.from.unix() * 1000} | to=${
        options.range.to.unix() * 1000
      }`;
    }

    if (query.resourceQueryText === '' || query.resourceQueryText === undefined) {
      throw new Error('Must provide a resource query');
    }
    if (query.metricQueryText === '' || query.metricQueryText === undefined) {
      throw new Error('Must provide a metric query');
    }
    return `${query.resourceQueryText} | ${query.metricQueryText} | from=${options.range.from.unix() * 1000} | to=${
      options.range.to.unix() * 1000
    }`;
  }

  getGroupInfo(md: any, group: string): string {
    for (var group_info of md.group_infos) {
      if (group_info.group === group) {
        return group_info.value;
      }
    }
    return '';
  }

  getTagsStr(md: any): string {
    let tags: string[] = [];
    for (var group_info of md.group_infos) {
      if (group_info.group === 'TAG') {
        tags.push(`${group_info.name}: ${group_info.value}`);
      }
    }
    return tags.sort().join(', ');
  }

  cmpFrames(frameA: any, frameB: any) {
    if (frameA.name < frameB.name) {
      return 1;
    }
    if (frameB.name < frameA.name) {
      return -1;
    }
    return 0;
  }

  buildResourceIdToName(resources: any[]): Map<string, string> {
    let map: Map<string, string> = new Map<string, string>();
    resources.forEach((resource) => map.set(resource.id.toString(), resource.name));
    return map;
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const promises = options.targets.map((query) => {
      const stmt = this.buildOpStatement(options, query);
      const interpolatedStmt = getTemplateSrv().replace(stmt, options.scopedVars);
      return this.execOp(interpolatedStmt).then((response) => {
        let resourceIdToName = this.buildResourceIdToName(response.resources);
        return response.metric_query.map((md: any) => {
          let metricName = this.getGroupInfo(md, 'METRIC');
          let resourceId = this.getGroupInfo(md, 'RESOURCE');
          let resourceName = resourceIdToName.get(resourceId) || resourceId;
          let frameName = `${metricName}: ${resourceName}`;
          let tagsStr = this.getTagsStr(md);
          if (tagsStr !== '') {
            frameName += ` { ${tagsStr} }`;
          }
          return new MutableDataFrame({
            refId: query.refId,
            name: frameName,
            meta: {
              executedQueryString: response.stmt,
            },
            fields: [
              { name: 'Time', type: FieldType.time, values: md.metric.timestamps },
              { name: 'Value', type: FieldType.number, values: md.metric.values },
            ],
          });
        });
      });
    });

    return Promise.all(promises).then((results) => ({ data: results.flat().sort(this.cmpFrames) }));
  }

  async metricFindQuery(query: MyVariableQuery, options?: any) {
    if (query.query === '' || query.query === undefined) {
      throw new Error('Must provide a nonempty query');
    }
    return this.execOp(query.query).then((response) => {
      if ('resources' in response) {
        return response.resources.map((resource: any) => {
          // handle resource chains, e.g. host | pod
          if (Array.isArray(resource)) {
            return { text: resource[resource.length - 1].name };
          }
          return { text: resource.name };
        });
      }
      throw new Error('Variable query must be a resource query');
    });
  }

  shorelineAnnotationToGrafana(annotation: any): AnnotationEvent[] {
    annotation.steps.sort((step1: any, step2: any) => {
      return step1.timestamp - step2.timestamp;
    });
    switch (annotation.entity_type) {
      case 'RESOURCE':
        return annotation.steps.map((step: any) => {
          let res: AnnotationEvent = {
            title: `${step.step_type}: ${annotation.resource_data.resource_name}`,
            time: step.timestamp,
          };
          return res;
        });
      case 'ACTION':
        return annotation.steps.map((step: any) => {
          return {
            title: `${step.step_type}: ${annotation.action.name} on ${annotation.resource_data.resource_name}`,
            text: `BOT: ${annotation.bot.name}, ACTION: ${annotation.action.name}`,
            time: step.timestamp,
            tags: [annotation.status],
          };
        });
      case 'ALARM':
        return annotation.steps.map((step: any) => {
          return {
            title: `${step.step_type}: ${annotation.alarm.name} on ${annotation.resource_data.resource_name}`,
            time: step.timestamp,
            tags: [annotation.status],
          };
        });
      case 'BOT':
        return annotation.steps.map((step: any) => {
          return {
            title: `${step.step_type}: ${annotation.bot.name} on ${annotation.resource_data.resource_name}`,
            text: `ALARM: ${annotation.alarm.name}, ACTION: ${annotation.action.name}`,
            time: step.timestamp,
            tags: [annotation.status],
          };
        });
      default:
        throw new Error(`Events of type ${annotation.entity_type} not supported`);
    }
  }

  async annotationQuery(options: AnnotationQueryRequest<MyQuery>): Promise<AnnotationEvent[]> {
    if (options.annotation.expr === '' || options.annotation.expr === undefined) {
      throw new Error('Must provide a nonempty annotation query');
    }
    let stmt = `${options.annotation.expr} | from=${options.range.from.unix() * 1000} | to=${
      options.range.to.unix() * 1000
    }`;
    return this.execOp(stmt).then((response) => {
      return response.annotation_query_rollup.annotation_list.flatMap(this.shorelineAnnotationToGrafana);
    });
  }

  async testDatasource() {
    const result = await this.execOp('host');

    if ('resources' in result === false) {
      return {
        status: 'error',
        message: `Health check test query failed, response data: ${JSON.stringify(result)}`,
      };
    }
    return {
      status: 'success',
      message: 'Success',
    };
  }

  async execOp(stmt: string) {
    if (stmt === '' || stmt === undefined) {
      throw new Error('Must provide a nonempty statement');
    }
    return getBackendSrv()
      .datasourceRequest({
        method: 'POST',
        url: this.url + execute_path,
        headers: {
          'Idempotency-Key': uuidv4(),
        },
        data: { statement: stmt },
      })
      .then((result) => result.data);
  }

  async getSymbols(symbolType: string) {
    return this.execOp('list ' + symbolType).then((result) => result.list_type.symbol);
  }
}
