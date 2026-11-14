// Jest `setupFiles` entry: runs in every test worker before any module import.
import 'reflect-metadata';
import { loadTestEnv } from './test-env';

loadTestEnv();
