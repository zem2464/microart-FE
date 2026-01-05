import React, { useState, useEffect } from 'react';
import { Button, notification, Badge, Tooltip } from 'antd';
import { CloudDownloadOutlined, ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';

const UpdateNotification = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(null);

  useEffect(() => {
    // Only run in Electron
    if (!window.electron?.isElectron) return;

    // Get current version
    window.electron.getVersion?.().then(version => {
      setCurrentVersion(version);
      console.log('[UpdateNotification] Current version:', version);
    });

    // Listen for update available
    const handleUpdateAvailable = () => {
      console.log('[UpdateNotification] Update available');
      setUpdateAvailable(true);
      
      notification.info({
        message: 'Update Available',
        description: 'A new version of Image Care is being downloaded in the background.',
        icon: <CloudDownloadOutlined style={{ color: '#1890ff' }} />,
        duration: 5,
      });
    };

    // Listen for update downloaded
    const handleUpdateDownloaded = () => {
      console.log('[UpdateNotification] Update downloaded');
      setUpdateDownloaded(true);
      setUpdateAvailable(false);
      
      notification.success({
        message: 'Update Ready',
        description: 'A new version has been downloaded. Restart the app to install it.',
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
        duration: 0, // Don't auto-close
        btn: (
          <Button
            type="primary"
            size="small"
            onClick={() => {
              window.electron.restartApp?.();
            }}
          >
            Restart Now
          </Button>
        ),
      });
    };

    // Register listeners
    if (window.electron.onUpdateAvailable) {
      window.electron.onUpdateAvailable(handleUpdateAvailable);
    }
    if (window.electron.onUpdateDownloaded) {
      window.electron.onUpdateDownloaded(handleUpdateDownloaded);
    }

    // Check for updates on mount (optional)
    window.electron.getUpdateStatus?.().then(status => {
      console.log('[UpdateNotification] Update status:', status);
      if (status?.updateAvailable) {
        setUpdateAvailable(true);
      }
    });
  }, []);

  // Don't render anything if not in Electron or no version
  if (!window.electron?.isElectron || !currentVersion) return null;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <Tooltip title={`Version ${currentVersion}`}>
        <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
          v{currentVersion}
        </span>
      </Tooltip>

      {updateDownloaded && (
        <Badge dot status="success">
          <Tooltip title="Update ready - restart to install">
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => window.electron.restartApp?.()}
              style={{ padding: '0 4px' }}
            >
              Restart to Update
            </Button>
          </Tooltip>
        </Badge>
      )}

      {updateAvailable && !updateDownloaded && (
        <Badge dot status="processing">
          <Tooltip title="Downloading update...">
            <CloudDownloadOutlined style={{ color: '#1890ff', fontSize: '14px' }} />
          </Tooltip>
        </Badge>
      )}
    </div>
  );
};

export default UpdateNotification;
