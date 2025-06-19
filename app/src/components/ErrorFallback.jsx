// HEXY.PRO App - /app/src/components/ErrorFallback.jsx - Component used to display an error message when an error is caught by an ErrorBoundary.
 

import { say } from '../utils/debug';

import PropTypes from 'prop-types';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
ErrorFallback.propTypes = {
  error: PropTypes.object.isRequired,
  resetErrorBoundary: PropTypes.func.isRequired,
};
  say('Error caught by ErrorBoundary', error);

  return (
    <div role="alert" className="error-fallback">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
};

export default ErrorFallback;
