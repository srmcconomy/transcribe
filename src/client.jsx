import React from 'react';
import ReactDOM from 'react-dom';
import { Route, BrowserRouter } from 'react-router-dom';
import { AppContainer } from 'react-hot-loader';

import Transcription from './components/transcription';
import Stream from './components/stream';
import Chat from './components/chat';

import styles from './client.css';

ReactDOM.render(
  <AppContainer>
    <BrowserRouter>
      <Route
        path="/:stream"
        render={props => (
          <div className={styles.container}>
            <div className={styles.app}>
              <div className={styles.streamContainer}>
                <Stream stream={props.match.params.stream} />
              </div>
              <Transcription stream={props.match.params.stream} />
            </div>
            <Chat stream={props.match.params.stream} />
          </div>
        )}
      />
    </BrowserRouter>
  </AppContainer>,
  document.getElementById('root')
);

