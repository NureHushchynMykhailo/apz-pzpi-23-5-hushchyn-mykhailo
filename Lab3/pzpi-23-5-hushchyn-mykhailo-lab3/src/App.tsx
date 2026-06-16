import { RouterProvider } from 'react-router-dom';
import { router } from './router';

const App = () => {
  return (
    // Передаємо нашу конфігурацію маршрутів у провайдер
    <RouterProvider router={router} />
  );
};

export default App;