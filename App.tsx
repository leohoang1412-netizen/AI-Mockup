import React from 'react';
import { useAppContext } from './context/AppContext';

import MainApp from './components/MainApp';
import LoginPage from './components/LoginPage';
import SettingsModal from './components/SettingsModal';
import ErrorNotification from './components/ErrorNotification';

const App: React.FC = () => {
    const { user, error, setError } = useAppContext();

    return (
        <>
            <ErrorNotification message={error} onDismiss={() => setError(null)} />
            <SettingsModal />
            {user ? <MainApp /> : <LoginPage />}
        </>
    );
};

export default App;