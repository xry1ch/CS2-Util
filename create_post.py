#!/usr/bin/env python3
"""
Script para importar múltiples posts de CS-UTILS desde archivos ZIP.
Permite seleccionar y procesar múltiples ZIPs de una sola vez.
"""

import os
import shutil
import json
import zipfile
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

# Configuración de rutas
SCRIPT_DIR = Path(__file__).parent
POSTS_DIR = SCRIPT_DIR / "src" / "data" / "posts"
IMAGES_DIR = SCRIPT_DIR / "src" / "assets" / "posts"


class PostImporterApp:
    def __init__(self, root):
        self.root = root
        self.root.title("CS-UTILS Post Importer")
        self.root.geometry("600x500")
        self.root.resizable(False, False)
        
        self.selected_zips = []
        
        self.create_widgets()
    
    def create_widgets(self):
        # Título
        title = tk.Label(
            self.root,
            text="CS-UTILS Post Importer",
            font=("Arial", 16, "bold"),
            pady=15,
        )
        title.pack()
        
        # Información
        info = tk.Label(
            self.root,
            text="Selecciona uno o múltiples archivos ZIP para importar",
            font=("Arial", 10),
            fg="#666",
        )
        info.pack(pady=5)
        
        # Frame para la lista de ZIPs
        list_frame = tk.LabelFrame(self.root, text="Archivos a importar", padx=10, pady=10)
        list_frame.pack(fill="both", padx=20, pady=15, expand=True)
        
        # Scrollbar para la lista
        scrollbar = tk.Scrollbar(list_frame)
        scrollbar.pack(side="right", fill="y")
        
        self.zip_listbox = tk.Listbox(
            list_frame,
            yscrollcommand=scrollbar.set,
            height=10,
            font=("Arial", 10)
        )
        self.zip_listbox.pack(fill="both", expand=True)
        scrollbar.config(command=self.zip_listbox.yview)
        
        # Botones de manejo de lista
        btn_frame = tk.Frame(self.root)
        btn_frame.pack(fill="x", padx=20, pady=5)
        
        btn_select = tk.Button(
            btn_frame,
            text="Seleccionar ZIPs",
            command=self.select_zips,
            bg="#2196F3",
            fg="white",
            font=("Arial", 11, "bold"),
            pady=8,
        )
        btn_select.pack(side="left", expand=True, fill="x", padx=5)
        
        btn_remove = tk.Button(
            btn_frame,
            text="Eliminar seleccionado",
            command=self.remove_selected_zip,
            fg="#d32f2f",
            font=("Arial", 10),
            pady=8,
        )
        btn_remove.pack(side="left", expand=True, fill="x", padx=5)
        
        btn_clear = tk.Button(
            btn_frame,
            text="Limpiar todo",
            command=self.clear_zips,
            fg="#d32f2f",
            font=("Arial", 10),
            pady=8,
        )
        btn_clear.pack(side="left", expand=True, fill="x", padx=5)
        
        # Frame de botones principales
        buttons_frame = tk.Frame(self.root)
        buttons_frame.pack(pady=20, padx=20, fill="x")
        
        # Botón Aceptar
        btn_accept = tk.Button(
            buttons_frame,
            text="Aceptar e Importar",
            command=self.import_all,
            bg="#4CAF50",
            fg="white",
            font=("Arial", 12, "bold"),
            pady=12,
        )
        btn_accept.pack(side="left", expand=True, fill="x", padx=5)
        
        # Botón Cancelar
        btn_cancel = tk.Button(
            buttons_frame,
            text="Cancelar",
            command=self.root.quit,
            bg="#757575",
            fg="white",
            font=("Arial", 12, "bold"),
            pady=12,
        )
        btn_cancel.pack(side="left", expand=True, fill="x", padx=5)
    
    def select_zips(self):
        """Selecciona múltiples archivos ZIP"""
        files = filedialog.askopenfilenames(
            title="Seleccionar archivos ZIP",
            filetypes=[("Archivo ZIP", "*.zip"), ("Todos", "*.*")]
        )
        if files:
            self.selected_zips.extend(list(files))
            self.update_zip_list()
    
    def remove_selected_zip(self):
        """Elimina el ZIP seleccionado"""
        selection = self.zip_listbox.curselection()
        if selection:
            idx = selection[0]
            del self.selected_zips[idx]
            self.update_zip_list()
    
    def clear_zips(self):
        """Limpia todos los ZIPs seleccionados"""
        self.selected_zips = []
        self.update_zip_list()
    
    def update_zip_list(self):
        """Actualiza la lista de ZIPs en pantalla"""
        self.zip_listbox.delete(0, tk.END)
        for i, zip_path in enumerate(self.selected_zips, 1):
            self.zip_listbox.insert(tk.END, f"{i}. {Path(zip_path).name}")
    
    def import_all(self):
        """Importa todos los ZIPs seleccionados"""
        if not self.selected_zips:
            messagebox.showwarning("Advertencia", "Debes seleccionar al menos un archivo ZIP")
            return
        
        try:
            success_count = 0
            error_count = 0
            errors = []
            
            for zip_path in self.selected_zips:
                try:
                    self.import_single_zip(zip_path)
                    success_count += 1
                except Exception as e:
                    error_count += 1
                    errors.append(f"{Path(zip_path).name}: {str(e)}")
            
            # Mostrar resultado
            message = f"Importación completada!\n\n✓ Exitosos: {success_count}\n✗ Errores: {error_count}"
            
            if errors:
                message += "\n\nErrores:\n" + "\n".join(errors[:5])
                if len(errors) > 5:
                    message += f"\n... y {len(errors) - 5} más"
                messagebox.showwarning("Importación con errores", message)
            else:
                messagebox.showinfo("Éxito", message)
            
            # Limpiar lista
            self.selected_zips = []
            self.update_zip_list()
        
        except Exception as e:
            messagebox.showerror("Error", f"Error durante la importación:\n{str(e)}")
    
    def import_single_zip(self, zip_path):
        """Importa un único archivo ZIP"""
        zip_path = Path(zip_path)
        
        with zipfile.ZipFile(zip_path, 'r') as zipf:
            # Leer JSON
            json_file_content = None
            for name in zipf.namelist():
                if name.endswith('post.json'):
                    json_file_content = zipf.read(name)
                    break
            
            if json_file_content is None:
                raise Exception("El ZIP no contiene un archivo post.json")
            
            post_data = json.loads(json_file_content)
            
            # Validar estructura mínima
            required_fields = ["mapId", "title", "images"]
            for field in required_fields:
                if field not in post_data:
                    raise Exception(f"El JSON no contiene el campo obligatorio '{field}'")
            
            map_id = post_data.get("mapId")
            map_name = map_id.replace("de_", "")
            post_id = post_data.get("id", "unknown")
            
            # Crear directorio de imágenes si no existe
            map_images_dir = IMAGES_DIR / map_name
            map_images_dir.mkdir(parents=True, exist_ok=True)
            
            # Copiar imágenes del ZIP con nombre único basado en el ID del post
            image_files = []
            image_counter = 1
            for name in zipf.namelist():
                if name.startswith("images/") and not name.endswith('/'):
                    image_data = zipf.read(name)
                    # Obtener extensión original
                    original_filename = Path(name).name
                    ext = Path(original_filename).suffix
                    # Renombrar con ID del post para evitar conflictos
                    new_filename = f"{post_id}-{image_counter}{ext}"
                    dest_path = map_images_dir / new_filename
                    with open(dest_path, 'wb') as f:
                        f.write(image_data)
                    image_files.append(f"{map_name}/{new_filename}")
                    image_counter += 1
            
            # Actualizar rutas de imágenes en los datos
            if image_files:
                post_data["images"] = image_files
            
            # Actualizar archivo TypeScript del mapa
            ts_file = POSTS_DIR / f"{map_name}.ts"
            
            if not ts_file.exists():
                raise Exception(f"El archivo {map_name}.ts no existe")
            
            with open(ts_file, 'r', encoding='utf-8') as f:
                ts_content = f.read()
            
            # Construir el objeto del post
            images_str = ", ".join([f"'{img}'" for img in post_data.get("images", [])])
            tags_str = ", ".join([f"'{tag}'" for tag in post_data.get("tags", [])])
            method_str = ", ".join([f"'{m}'" for m in post_data.get("method", [])])
            
            post_entry = f"""  {{
    id: '{post_id}',
    mapId: '{map_id}',
    title: '{post_data.get("title", "")}',
    images: [{images_str}],
    tags: [{tags_str}],
    method: [{method_str}],"""
            
            if "tip" in post_data and post_data["tip"]:
                post_entry += f"\n    tip: '{post_data['tip']}',"
            
            post_entry += "\n  },"
            
            # Verificar si el post ya existe
            if post_id and f"id: '{post_id}'" in ts_content:
                # Reemplazar post existente
                start_idx = ts_content.find(f"id: '{post_id}'")
                start_idx = ts_content.rfind('{', 0, start_idx)
                end_idx = ts_content.find('},', start_idx) + 2
                ts_content = ts_content[:start_idx] + post_entry + '\n' + ts_content[end_idx:]
            else:
                # Agregar nuevo post
                if "= []" in ts_content:
                    ts_content = ts_content.replace("= []", f"= [\n{post_entry}\n]")
                else:
                    lines = ts_content.split('\n')
                    insert_idx = -1
                    for i in range(len(lines) - 1, -1, -1):
                        if lines[i].strip() == ']':
                            insert_idx = i
                            break
                    
                    if insert_idx == -1:
                        raise Exception(f"No se pudo encontrar el cierre del array en {map_name}.ts")
                    
                    lines.insert(insert_idx, post_entry)
                    ts_content = '\n'.join(lines)
            
            # Escribir archivo actualizado
            with open(ts_file, 'w', encoding='utf-8') as f:
                f.write(ts_content)


def main():
    root = tk.Tk()
    app = PostImporterApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()



def main():
    root = tk.Tk()
    app = PostImporterApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
