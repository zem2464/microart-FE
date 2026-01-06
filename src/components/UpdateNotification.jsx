import React, { useState, useEffect, useRef } from 'react';
import { Button, notification, Badge, Tooltip, Progress, Space, message, Modal } from 'antd';
import { CloudDownloadOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const UpdateNotification = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const initializedRef = useRef(false);
  const downloadTimeoutRef = useRef(null);

  useEffect(() => {
    // Only run in Electron
    if (!window.electron?.isElectron) return;

    // Avoid duplicate listeners in React StrictMode/dev double-mount
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Get current version
    window.electron.getVersion?.().then(version => {
      setCurrentVersion(version);
      console.log('[UpdateNotification] Current version:', version);
    });

    // Listen for checking for update
    const handleUpdateChecking = () => {
      console.log('[UpdateNotification] Checking for updates...');
      setIsChecking(true);
    };

    // Listen for update available
    const handleUpdateAvailable = (event, info) => {
      console.log('[UpdateNotification] Update available:', info?.version);
      setUpdateAvailable(true);
      setIsChecking(false);
      setDownloadProgress(0);
      
      notification.info({
        message: 'Update Available',
        description: `Version ${info?.version || 'new'} is being downloaded.`,
        icon: <CloudDownloadOutlined style={{ color: '#1890ff' }} />,
        duration: 5,
      });

      // Set a timeout to detect stalled downloads (10 minutes)
      downloadTimeoutRef.current = setTimeout(() => {
        console.warn('[UpdateNotification] Download timeout - resetting state');
        setUpdateAvailable(false);
        setDownloadProgress(0);
        setUpdateError('Download timeout');
        notification.warning({
          message: 'Update Download Timeout',
          description: 'The update download is taking longer than expected. Please check your internet connection.',
          icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
          duration: 0,
          btn: (
            <Space>
              <Button
                size="small"
                type="primary"
                onClick={() => {
                  notification.destroy();
                  handleCheckForUpdates();
                }}
              >
                Retry
              </Button>
              <Button
                size="small"
                type="text"
                onClick={() => notification.destroy()}
              >
                Dismiss
              </Button>
            </Space>
          ),
        });
      }, 10 * 60 * 1000); // 10 minutes
    };

    // Listen for update not available
    const handleUpdateNotAvailable = () => {
      console.log('[UpdateNotification] No updates available');
      setIsChecking(false);
      setUpdateAvailable(false);
    };

    // Listen for download progress
    const handleDownloadProgress = (event, progressInfo) => {
      const percent = progressInfo?.percent || 0;
      console.log('[UpdateNotification] Download progress:', percent + '%');
      setDownloadProgress(percent);
    };

    // Listen for update error
    const handleUpdateError = (event, errorInfo) => {
      console.error('[UpdateNotification] Update error:', errorInfo?.message);
      const errorMsg = errorInfo?.message || 'Unknown error occurred';
      setUpdateError(errorMsg);
      setIsChecking(false);
      setUpdateAvailable(false);
      setDownloadProgress(0);
      
      if (downloadTimeoutRef.current) {
        clearTimeout(downloadTimeoutRef.current);
        downloadTimeoutRef.current = null;
      }

      // Show error notification with retry button
      notification.error({
        message: 'Update Failed',
        description: errorMsg,
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        duration: 0, // Don't auto-close
        btn: (
          <Space>
            <Button
              size="small"
              onClick={() => {
                notification.destroy();
                handleCheckForUpdates();
              }}
            >
              Retry
            </Button>
            <Button
              size="small"
              type="text"
              onClick={() => notification.destroy()}
            >
              Dismiss
            </Button>
          </Space>
        ),
      });
    };

    // Listen for update downloaded
    const handleUpdateDownloaded = (event, info) => {
      console.log('[UpdateNotification] Update downloaded:', info?.version);
      
      // Clear timeout if download completes
      if (downloadTimeoutRef.current) {
        clearTimeout(downloadTimeoutRef.current);
        downloadTimeoutRef.current = null;
      }

      setUpdateDownloaded(true);
      setUpdateAvailable(false);
      setDownloadProgress(100);
      setIsChecking(false);
      setUpdateError(null);
      
      // Show modal dialog to force restart
      Modal.success({
        title: 'Update Downloaded Successfully!',
        icon: <CheckCircleOutlined />,
        content: (
          <div>
            <p>Version <strong>{info?.version || 'new'}</strong> has been downloaded.</p>
            <p>The application needs to restart to complete the installation.</p>
            <p style={{ marginTop: 16, color: '#ff4d4f', fontWeight: 500 }}>
              Please save your work and restart now.
            </p>
          </div>
        ),
        okText: 'Restart Now',
        cancelText: 'Restart Later',
        okButtonProps: {
          size: 'large',
          type: 'primary',
        },
        cancelButtonProps: {
          size: 'large',
        },
        maskClosable: false,
        closable: false,
        onOk: () => {
          console.log('========================================');
          console.log('[UpdateNotification] USER CLICKED RESTART NOW (Modal)');
          console.log('[UpdateNotification] Timestamp:', new Date().toISOString());
          console.log('[UpdateNotification] window.electron available:', !!window.electron);
          console.log('[UpdateNotification] window.electron.restartApp available:', typeof window.electron?.restartApp);
          console.log('========================================');
          try {
            if (window.electron?.restartApp) {
              console.log('[UpdateNotification] Calling window.electron.restartApp()');
              window.electron.restartApp();
              console.log('[UpdateNotification] ✓ restartApp() called successfully');
            } else {
              console.error('[UpdateNotification] ✗ window.electron.restartApp is not available!');
              message.error('Restart function not available. Please close and reopen the app manually.');
            }
          } catch (error) {
            console.error('[UpdateNotification] ✗ Error calling restartApp():', error);
            message.error('Failed to restart app: ' + error.message);
          }
        },
        onCancel: () => {
          // Just close modal, keep the badge visible
          notification.info({
            message: 'Restart Reminder',
            description: 'Don\'t forget to restart the app to complete the update installation.',
            duration: 5,
          });
        },
      });
    };

    // Register listeners; store possible unsubscribe handles if provided
    const offUpdateChecking = window.electron.onUpdateChecking?.(handleUpdateChecking);
    const offUpdateAvailable = window.electron.onUpdateAvailable?.(handleUpdateAvailable);
    const offUpdateNotAvailable = window.electron.onUpdateNotAvailable?.(handleUpdateNotAvailable);
    const offDownloadProgress = window.electron.onUpdateDownloadProgress?.(handleDownloadProgress);
    const offUpdateDownloaded = window.electron.onUpdateDownloaded?.(handleUpdateDownloaded);
    const offUpdateError = window.electron.onUpdateError?.(handleUpdateError);

    // Listen for restart initiated event
    const handleRestartInitiated = () => {
      console.log('[UpdateNotification] Restart initiated - app is restarting now...');
      message.loading({ content: 'Restarting application...', key: 'restart', duration: 0 });
    };
    
    let offRestartInitiated;
    if (window.electron?.onRestartInitiated) {
      offRestartInitiated = window.electron.onRestartInitiated(handleRestartInitiated);
    }

    // Check for updates on mount (optional)
    window.electron.getUpdateStatus?.().then(status => {
      console.log('[UpdateNotification] Update status:', status);
      if (status?.updateAvailable) {
        setUpdateAvailable(true);
      }
      if (status?.downloadProgress) {
        setDownloadProgress(status.downloadProgress);
      }
    });

    return () => {
      offUpdateChecking?.();
      offUpdateAvailable?.();
      offUpdateNotAvailable?.();
      offDownloadProgress?.();
      offUpdateDownloaded?.();
      offUpdateError?.();
      offRestartInitiated?.();
      if (downloadTimeoutRef.current) {
        clearTimeout(downloadTimeoutRef.current);
      }
    };
  }, []);

  const handleCheckForUpdates = async () => {
    if (isChecking || updateAvailable) return;
    
    setIsChecking(true);
    setUpdateError(null);
    
    try {
      const result = await window.electron.checkForUpdates?.();
      console.log('[UpdateNotification] Manual check result:', result);
      
      if (result?.isDev) {
        message.info('Update checks are disabled in development mode');
        setIsChecking(false);
      } else if (result?.success === false) {
        const errorMsg = result?.error || 'Failed to check for updates';
        setUpdateError(errorMsg);
        notification.error({
          message: 'Update Check Failed',
          description: errorMsg,
          icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
          duration: 0,
          btn: (
            <Space>
              <Button
                size="small"
                type="primary"
                onClick={() => {
                  notification.destroy();
                  handleCheckForUpdates();
                }}
              >
                Retry
              </Button>
              <Button
                size="small"
                type="text"
                onClick={() => notification.destroy()}
              >
                Dismiss
              </Button>
            </Space>
          ),
        });
        setIsChecking(false);
      } else if (!result?.updateInfo) {
        message.success('You are using the latest version!');
        setIsChecking(false);
      }
      // If update is available, event handlers will manage state
    } catch (error) {
      console.error('[UpdateNotification] Check for updates error:', error);
      const errorMsg = error?.message || 'Failed to check for updates';
      setUpdateError(errorMsg);
      notification.error({
        message: 'Update Check Failed',
        description: errorMsg,
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
        duration: 0,
        btn: (
          <Space>
            <Button
              size="small"
              type="primary"
              onClick={() => {
                notification.destroy();
                handleCheckForUpdates();
              }}
            >
              Retry
            </Button>
            <Button
              size="small"
              type="text"
              onClick={() => notification.destroy()}
            >
              Dismiss
            </Button>
          </Space>
        ),
      });
      setIsChecking(false);
    }
  };

  // Don't render anything if not in Electron or no version
  if (!window.electron?.isElectron || !currentVersion) return null;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <Tooltip title={`Version ${currentVersion}`}>
        <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
          v{currentVersion}
        </span>
      </Tooltip>

      {/* Check for Updates Button */}
      {!updateAvailable && !updateDownloaded && (
        <Tooltip title={updateError ? `Last check failed: ${updateError}. Click to retry.` : 'Check for updates'}>
          <Button
            type="text"
            size="small"
            icon={isChecking ? <SyncOutlined spin /> : updateError ? <ExclamationCircleOutlined /> : <SyncOutlined />}
            onClick={handleCheckForUpdates}
            disabled={isChecking}
            style={{ 
              padding: '0 4px', 
              fontSize: '12px',
              color: updateError ? '#ff4d4f' : undefined 
            }}
          />
        </Tooltip>
      )}

      {/* Update Downloaded - Ready to Install */}
      {updateDownloaded && (
        <Badge count="!" style={{ backgroundColor: '#52c41a' }}>
          <Tooltip title="Update ready - Click to restart now">
            <Button
              type="primary"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => {
                console.log('========================================');
                console.log('[UpdateNotification] USER CLICKED RESTART NOW (Badge Button)');
                console.log('[UpdateNotification] Timestamp:', new Date().toISOString());
                console.log('[UpdateNotification] window.electron available:', !!window.electron);
                console.log('[UpdateNotification] window.electron.restartApp available:', typeof window.electron?.restartApp);
                console.log('========================================');
                try {
                  if (window.electron?.restartApp) {
                    console.log('[UpdateNotification] Calling window.electron.restartApp()');
                    window.electron.restartApp();
                    console.log('[UpdateNotification] ✓ restartApp() called successfully');
                  } else {
                    console.error('[UpdateNotification] ✗ window.electron.restartApp is not available!');
                    message.error('Restart function not available. Please close and reopen the app manually.');
                  }
                } catch (error) {
                  console.error('[UpdateNotification] ✗ Error calling restartApp():', error);
                  message.error('Failed to restart app: ' + error.message);
                }
              }}
              danger
              style={{ padding: '4px 8px', fontWeight: 600 }}
            >
              Restart Now
            </Button>
          </Tooltip>
        </Badge>
      )}

      {/* Update Downloading - Show Progress */}
      {updateAvailable && !updateDownloaded && (
        <Badge dot status="processing">
          <Tooltip title={
            <div>
              <div>Downloading update...</div>
              <Progress 
                percent={downloadProgress} 
                size="small" 
                status="active"
                strokeColor="#1890ff"
                style={{ marginTop: 4, marginBottom: 0 }}
              />
            </div>
          }>
            <Space size={4} style={{ cursor: 'default' }}>
              <CloudDownloadOutlined style={{ color: '#1890ff', fontSize: '14px' }} />
              <span style={{ fontSize: '11px', color: '#1890ff' }}>
                {downloadProgress}%
              </span>
            </Space>
          </Tooltip>
        </Badge>
      )}
    </div>
  );
};

export default UpdateNotification;
