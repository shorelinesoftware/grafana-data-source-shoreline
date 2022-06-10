import { v4 as uuidv4 } from 'uuid';

import {
  AnnotationEvent,
  AnnotationQueryRequest,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType
} from '@grafana/data';

import { getBackendSrv, getTemplateSrv } from '@grafana/runtime';

import { MyQuery, MyDataSourceOptions, MyVariableQuery } from './types';

const executePath = '/v1/execute';

function buildOpStatement(options: DataQueryRequest<MyQuery>, query: MyQuery): string {
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
  return `${query.resourceQueryText} | ${query.metricQueryText} | from=${
    options.range.from.unix() * 1000
  } | to=${options.range.to.unix() * 1000}`;
}

function getGroupInfo(md: any, group: string): string {
  const foundGroupInfo = md.group_infos.find((groupInfo: any) => groupInfo.group === group);
  if (foundGroupInfo !== undefined) {
    return foundGroupInfo.value;
  }
  return '';
}

function getTagsStr(md: any): string {
  const tags: string[] = [];
  md.group_infos.forEach((groupInfo: any) => {
    if (groupInfo.group === 'TAG') {
      tags.push(`${groupInfo.name}: ${groupInfo.value}`);
    }
  });
  return tags.sort().join(', ');
}

function cmpFrames(frameA: any, frameB: any) {
  if (frameA.name < frameB.name) {
    return 1;
  }
  if (frameB.name < frameA.name) {
    return -1;
  }
  return 0;
}

function buildResourceIdToName(resources: any[]): Map<string, string> {
  const map: Map<string, string> = new Map<string, string>();
  resources.forEach((resource) => {
    // handle resource chains, e.g. host | pod
    if (Array.isArray(resource)) {
      const lastResource = resource[resource.length - 1];
      map.set(lastResource.id.toString(), lastResource.name);
    } else {
      map.set(resource.id.toString(), resource.name);
    }
  });
  return map;
}

function buildLinuxCmdDataFrames(
  response: any,
  refId: string,
  resourceIdToName: Map<string, string>
) {
  const resourceNames: string[] = [];
  const stdoutValues: string[] = [];
  const stderrValues: string[] = [];
  const exitStatusValues: number[] = [];

  response.linux_cmd.forEach((cmdRes: any) => {
    resourceNames.push(cmdRes.pod || resourceIdToName.get(cmdRes.host_id.toString()));
    stdoutValues.push(cmdRes.stdout);
    stderrValues.push(cmdRes.stderr);
    exitStatusValues.push(cmdRes.exit_status);
  });
  return new MutableDataFrame({
    refId,
    name: 'linux_cmd',
    meta: {
      executedQueryString: response.stmt
    },
    fields: [
      { name: 'Resource Name', type: FieldType.string, values: resourceNames },
      { name: 'stdout', type: FieldType.string, values: stdoutValues },
      { name: 'stderr', type: FieldType.string, values: stderrValues },
      { name: 'Exit Status', type: FieldType.number, values: exitStatusValues }
    ]
  });
}

function shorelineAnnotationToGrafana(annotation: any): AnnotationEvent[] {
  annotation.steps.sort((step1: any, step2: any) => step1.timestamp - step2.timestamp);
  switch (annotation.entity_type) {
    case 'RESOURCE':
      return annotation.steps.map((step: any) => {
        const res: AnnotationEvent = {
          title: `${step.step_type}: ${annotation.resource_data.resource_name}`,
          time: step.timestamp
        };
        return res;
      });
    case 'ACTION':
      return annotation.steps.map((step: any) => ({
        title: `${step.step_type}: ${annotation.action.name} on ${annotation.resource_data.resource_name}`,
        text: `BOT: ${annotation.bot.name}, ACTION: ${annotation.action.name}`,
        time: step.timestamp,
        tags: [annotation.status]
      }));
    case 'ALARM':
      return annotation.steps.map((step: any) => ({
        title: `${step.step_type}: ${annotation.alarm.name} on ${annotation.resource_data.resource_name}`,
        time: step.timestamp,
        tags: [annotation.status]
      }));
    case 'BOT':
      return annotation.steps.map((step: any) => ({
        title: `${step.step_type}: ${annotation.bot.name} on ${annotation.resource_data.resource_name}`,
        text: `ALARM: ${annotation.alarm.name}, ACTION: ${annotation.action.name}`,
        time: step.timestamp,
        tags: [annotation.status]
      }));
    default:
      throw new Error(`Events of type ${annotation.entity_type} not supported`);
  }
}

function buildMetricQueryFrame(
  metricData: any,
  refId: string,
  stmt: string,
  resourceIdToName: Map<string, string>
) {
  const metricName = getGroupInfo(metricData, 'METRIC');
  const resourceId = getGroupInfo(metricData, 'RESOURCE');
  const resourceName = resourceIdToName.get(resourceId) || resourceId;
  let frameName = `${metricName}: ${resourceName}`;
  const tagsStr = getTagsStr(metricData);
  if (tagsStr !== '') {
    frameName += ` { ${tagsStr} }`;
  }
  return new MutableDataFrame({
    refId,
    name: frameName,
    meta: {
      executedQueryString: stmt
    },
    fields: [
      { name: 'Time', type: FieldType.time, values: metricData.metric.timestamps },
      { name: 'Value', type: FieldType.number, values: metricData.metric.values }
    ]
  });
}

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  url?: string;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url;
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const promises = options.targets.map((query) => {
      const stmt = buildOpStatement(options, query);
      const interpolatedStmt = getTemplateSrv().replace(stmt, options.scopedVars);
      return this.execOp(interpolatedStmt).then((response) => {
        const resourceIdToName = buildResourceIdToName(response.resources);
        if ('metric_query' in response) {
          return response.metric_query.map((md: any) =>
            buildMetricQueryFrame(md, query.refId, response.stmt, resourceIdToName)
          );
        }
        if ('linux_cmd' in response) {
          return buildLinuxCmdDataFrames(response, query.refId, resourceIdToName);
        }
        return [];
      });
    });

    return Promise.all(promises).then((results) => ({ data: results.flat().sort(cmpFrames) }));
  }

  async metricFindQuery(query: MyVariableQuery, options?: any) {
    if (query.query === '' || query.query === undefined) {
      throw new Error('Must provide a nonempty query');
    }
    const interpolatedStmt = options
      ? getTemplateSrv().replace(query.query, options.scopedVars)
      : query.query;
    return this.execOp(interpolatedStmt).then((response) => {
      if ('resources' in response) {
        return response.resources.map((resource: any) => {
          // handle resource chains, e.g. host | pod
          if (Array.isArray(resource)) {
            return { text: resource[resource.length - 1].name };
          }
          return { text: resource.name };
        });
      }
      if ('list_type' in response) {
        return response.list_type.symbol.map((symbol: any) => ({ text: symbol.name }));
      }
      throw new Error('Variable query must be a resource query or list symbol');
    });
  }

  async annotationQuery(options: AnnotationQueryRequest<MyQuery>): Promise<AnnotationEvent[]> {
    if (options.annotation.expr === '' || options.annotation.expr === undefined) {
      throw new Error('Must provide a nonempty annotation query');
    }
    const stmt = `${options.annotation.expr} | from=${options.range.from.unix() * 1000} | to=${
      options.range.to.unix() * 1000
    }`;
    return this.execOp(stmt).then((response) => {
      if (
        'annotation_query_rollup' in response === false ||
        'annotation_list' in response.annotation_query_rollup === false
      ) {
        throw new Error('Annotation query result missing from json response');
      }
      return response.annotation_query_rollup.annotation_list.flatMap(shorelineAnnotationToGrafana);
    });
  }

  async testDatasource() {
    const result = await this.execOp('host');

    if ('resources' in result === false) {
      return {
        status: 'error',
        message: `Health check test query failed, response data: ${JSON.stringify(result)}`
      };
    }
    return {
      status: 'success',
      message: 'Success'
    };
  }

  async execOp(stmt: string) {
    if (stmt === '' || stmt === undefined) {
      throw new Error('Must provide a nonempty statement');
    }
    return getBackendSrv()
      .datasourceRequest({
        method: 'POST',
        url: this.url + executePath,
        headers: {
          'Idempotency-Key': uuidv4()
        },
        data: { statement: stmt }
      })
      .then((result) => result.data);
  }

  async getSymbols(symbolType: string) {
    return this.execOp(`list ${symbolType}`).then((result) => result.list_type.symbol);
  }
}
