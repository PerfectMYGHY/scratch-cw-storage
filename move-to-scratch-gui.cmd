@echo off

echo ���ڸ���...

xcopy .\dist ..\scratch-gui\node_modules\scratch-storage\dist /s /e /h /y

xcopy .\dist ..\scratch-gui\node_modules\scratch-vm\node_modules\scratch-storage\dist /s /e /h /y

echo ������ϣ�

