import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';

import * as middlewares from './middlewares';
import MessageResponse from './interfaces/MessageResponse';

require('dotenv').config();

const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(
  cors({
    origin: '*',
  }),
);
app.use(express.json());

app.get<{}, MessageResponse>('/', (req: express.Request, res: express.Response) => {
  res.json({
    message: 'DRILL BOT SERVER API🌏✨🌈🦄',
  });
});


app.use(middlewares.notFound);
app.use(middlewares.errorHandler);


export default app;
