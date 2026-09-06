<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Directrices de Proyecto: Pulse&Cook

## 🚨 REGLA CRÍTICA OBLIGATORIA: SINCRONIZACIÓN CON SUPABASE & ENTREGA DE SCRIPTS SQL
Siempre que se realice una modificación en la aplicación (código, tipos, nuevos features, modelos de datos) que requiera o impacte la estructura de **Supabase**:
1. **NO asumas que la base de datos se actualiza sola**: El asistente no tiene acceso directo a la consola ni a credenciales administrativas de Supabase.
2. **OBLIGATORIO PROVEER EL SCRIPT SQL**: Si se añade una columna, una tabla, un enum, una política de RLS, una restricción o una migración de datos, **DEBES OBLIGATORIAMENTE proporcionar al usuario el script SQL completo, idempotente y listo para copiar y pegar en el SQL Editor de Supabase**.
3. **Validación Previa**: Nunca envíes payloads a Supabase con columnas que no existan en la base de datos sin antes advertirlo y dar el script SQL correspondiente para crearlas.
4. **Perfil del Autor Principal**: El usuario principal y creador de las recetas base es `leanBorsini` (Email: `leoborsini12@gmail.com`, UUID: `1afb8de4-9294-4f57-af9f-dc50b3e6e768`). Toda receta propia debe mantener su `user_id` asociado a este UUID para permitir edición y borrado.
5. **Ingredientes Bilingües**: En la tabla `ingredients`, `name_es` y `name_en` deben ser nombres traducidos genuinos (ej. `Tomate` / `Tomato`), nunca repitiendo el nombre en español en `name_en`.
6. **Valoraciones**: Las calificaciones van exclusivamente en la tabla `ratings` (`recipe_id`, `user_id`, `stars`). Nunca ensuciar la tabla `comments` con registros técnicos.

