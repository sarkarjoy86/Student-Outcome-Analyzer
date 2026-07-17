import express from 'express';
import authRoutes from './routes/authRoutes.js';
import obeRoutes from './routes/obeRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import evaluationRoutes from './routes/evaluationRoutes.js';
import fs from 'fs';

let log = '';

try {
  const app = express();
  app.use("/api/auth", authRoutes);
  app.use("/api", obeRoutes);
  app.use("/api", teacherRoutes);
  app.use("/api", uploadRoutes);
  app.use("/api", evaluationRoutes);

  // Fallback 404 handler
  app.use((req, res) => {
    res.status(404).json({ message: "Not Found" });
  });
  
  app.lazyrouter();

  function printRoutes(stack, prefix = '') {
    stack.forEach((layer) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
        log += `${methods} ${prefix}${layer.route.path}\n`;
      } else if (layer.name === 'router' && layer.handle.stack) {
        // Look up regexp prefix or path mapping
        let matchPrefix = prefix;
        if (layer.regexp) {
          const regStr = layer.regexp.toString();
          // Match standard routing regexp
          const match = regStr.match(/^\/\^\\(\/\w+)\\\/\?\(\?\=\\\/\|\$\)/);
          if (match) {
            matchPrefix += match[1];
          }
        }
        printRoutes(layer.handle.stack, matchPrefix);
      }
    });
  }

  printRoutes(app._router.stack);
  fs.writeFileSync('C:/Users/sarka/.gemini/antigravity/brain/b6fda638-548c-4124-acd5-f32c7c6dcbad/routes-print-result.txt', log, 'utf8');
} catch (err) {
  fs.writeFileSync('C:/Users/sarka/.gemini/antigravity/brain/b6fda638-548c-4124-acd5-f32c7c6dcbad/routes-print-result.txt', `ERROR: ${err.message}\nStack: ${err.stack}`, 'utf8');
}
