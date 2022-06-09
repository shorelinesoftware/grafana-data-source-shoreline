import { FunctionComponent, useCallback, ChangeEventHandler } from 'react';
import { LegacyForms } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData } from './types';

type ConfigEditorProps = DataSourcePluginOptionsEditorProps<MyDataSourceOptions>;

export const ConfigEditor: FunctionComponent<ConfigEditorProps> = ({
  options,
  onOptionsChange
}) => {
  const onShorelineURLChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    ({ target: { value: shorelineUrl } }) => {
      onOptionsChange({ ...options, jsonData: { ...options.jsonData, shorelineUrl } });
    },
    [onOptionsChange, options]
  );

  // Secure field (only sent to the backend)
  const onAPIKeyChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    ({ target: { value: apiKey } }) => {
      onOptionsChange({
        ...options,
        secureJsonData: { apiKey }
      });
    },
    [options, onOptionsChange]
  );

  const onResetAPIKey = useCallback(() => {
    const { secureJsonFields, secureJsonData } = options;

    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...secureJsonFields,
        apiKey: false
      },
      secureJsonData: {
        ...secureJsonData,
        apiKey: ''
      }
    });
  }, [options, onOptionsChange]);

  const { jsonData, secureJsonFields } = options;
  const secureJsonData = (options.secureJsonData || {}) as MySecureJsonData;

  return (
    <div className="gf-form-group">
      <div className="gf-form">
        <LegacyForms.FormField
          label="Shoreline URL"
          labelWidth={6}
          inputWidth={20}
          onChange={onShorelineURLChange}
          defaultValue={jsonData.shorelineUrl || ''}
          placeholder="Shoreline API URL"
        />
      </div>

      <div className="gf-form-inline">
        <div className="gf-form">
          <LegacyForms.SecretFormField
            isConfigured={(secureJsonFields && secureJsonFields.apiKey) as boolean}
            defaultValue={secureJsonData.apiKey || ''}
            label="API Key"
            placeholder="Shoreline API Key"
            labelWidth={6}
            inputWidth={20}
            onReset={onResetAPIKey}
            onChange={onAPIKeyChange}
          />
        </div>
      </div>
    </div>
  );
};
