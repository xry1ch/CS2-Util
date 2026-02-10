#!/usr/bin/env python3
"""
Script para agregar posts de CS-UTILS de forma interactiva.
Permite seleccionar imágenes, agregar metadata y actualiza automáticamente
el archivo TypeScript y copia las imágenes.
"""

import os
import shutil
import re
import json
import zipfile
from pathlib import Path
from datetime import datetime
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from tkinterdnd2 import DND_FILES, TkinterDnD
import tempfile

# Configuración de rutas
SCRIPT_DIR = Path(__file__).parent
POSTS_DIR = SCRIPT_DIR / "src" / "data" / "posts"
IMAGES_DIR = SCRIPT_DIR / "src" / "assets" / "posts"

# Opciones
MAPS = [
    "de_ancient",
    "de_anubis",
    "de_dust2",
    "de_inferno",
    "de_mirage",
    "de_nuke",
    "de_overpass",
]

SIDES = ["CT", "T"]
SITES = ["A", "MID", "B"]
UTILITIES = ["SMOKE", "MOLO", "FLASH", "NADE"]
METHOD_COMPONENTS = ["THROW", "DOUBLE", "JUMP", "CROUCH", "WALK", "RUN"]


class PostCreatorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("CS-UTILS Post Creator")
        self.root.geometry("700x850")
        self.root.resizable(False, False)
        
        self.images = []
        # Directorio temporal que persiste durante la sesión
        self.temp_dir = Path(tempfile.mkdtemp(prefix="cs2_post_"))
        
        # Limpiar al cerrar
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
        self.create_widgets()
    
    def create_widgets(self):
        # Título
        title = tk.Label(
            self.root,
            text="CS-UTILS Post Creator",
            font=("Arial", 16, "bold"),
            pady=10,
        )
        title.pack()
        
        # Frame para drag & drop
        drop_frame = tk.LabelFrame(self.root, text="Imágenes (en orden)", padx=10, pady=20)
        drop_frame.pack(fill="both", padx=20, pady=10, expand=True)
        
        self.drop_zone = tk.Label(
            drop_frame,
            text="Arrastra imágenes aquí\no haz click para seleccionar",
            bg="#f0f0f0",
            fg="#666",
            font=("Arial", 11),
            height=3,
            cursor="hand2",
            relief="solid",
            borderwidth=2,
        )
        self.drop_zone.pack(fill="both", padx=10, pady=10)
        self.drop_zone.bind("<Button-1>", lambda e: self.select_images())
        
        # Registrar drag & drop
        self.drop_zone.drop_target_register(DND_FILES)
        self.drop_zone.dnd_bind("<<Drop>>", self.drop_files)
        
        # Lista de imágenes seleccionadas
        list_frame = tk.Frame(drop_frame)
        list_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        tk.Label(list_frame, text="Imágenes seleccionadas:", font=("Arial", 9, "bold")).pack(anchor="w")
        
        # Scrollbar para la lista
        scrollbar = tk.Scrollbar(list_frame)
        scrollbar.pack(side="right", fill="y")
        
        self.image_listbox = tk.Listbox(list_frame, yscrollcommand=scrollbar.set, height=6, font=("Arial", 9))
        self.image_listbox.pack(fill="both", expand=True)
        scrollbar.config(command=self.image_listbox.yview)
        
        # Botones para manejar la lista
        btn_frame = tk.Frame(drop_frame)
        btn_frame.pack(fill="x", padx=10, pady=5)
        
        btn_remove = tk.Button(
            btn_frame,
            text="Eliminar seleccionada",
            command=self.remove_selected_image,
            fg="#d32f2f",
        )
        btn_remove.pack(side="left", padx=2)
        
        btn_clear = tk.Button(
            btn_frame,
            text="Limpiar todo",
            command=self.clear_images,
            fg="#d32f2f",
        )
        btn_clear.pack(side="left", padx=2)
        
        # Frame principal
        form = tk.Frame(self.root, padx=20, pady=10)
        form.pack(fill="both", expand=True)
        
        # Title
        tk.Label(form, text="Título:").grid(row=0, column=0, sticky="w", pady=5)
        self.title_entry = tk.Entry(form, width=40)
        self.title_entry.grid(row=0, column=1, pady=5, sticky="ew")
        
        # Map
        tk.Label(form, text="Mapa:").grid(row=1, column=0, sticky="w", pady=5)
        self.map_var = tk.StringVar()
        self.map_combo = ttk.Combobox(
            form, textvariable=self.map_var, values=MAPS, state="readonly", width=37
        )
        self.map_combo.grid(row=1, column=1, pady=5, sticky="ew")
        self.map_combo.current(0)
        
        # Method Components
        tk.Label(form, text="Método:").grid(row=2, column=0, sticky="nw", pady=5)
        method_frame = tk.Frame(form)
        method_frame.grid(row=2, column=1, sticky="w", pady=5)
        self.method_vars = {}
        for i, component in enumerate(METHOD_COMPONENTS):
            var = tk.BooleanVar()
            self.method_vars[component] = var
            cb = tk.Checkbutton(method_frame, text=component, variable=var)
            cb.grid(row=i // 3, column=i % 3, padx=5, sticky="w")
        
        # Tags - Sides
        tk.Label(form, text="Side:").grid(row=3, column=0, sticky="w", pady=5)
        side_frame = tk.Frame(form)
        side_frame.grid(row=3, column=1, sticky="w", pady=5)
        self.side_vars = {}
        for i, side in enumerate(SIDES):
            var = tk.BooleanVar()
            self.side_vars[side] = var
            cb = tk.Checkbutton(side_frame, text=side, variable=var)
            cb.grid(row=0, column=i, padx=5)
        
        # Tags - Sites
        tk.Label(form, text="Site:").grid(row=4, column=0, sticky="w", pady=5)
        site_frame = tk.Frame(form)
        site_frame.grid(row=4, column=1, sticky="w", pady=5)
        self.site_vars = {}
        for i, site in enumerate(SITES):
            var = tk.BooleanVar()
            self.site_vars[site] = var
            cb = tk.Checkbutton(site_frame, text=site, variable=var)
            cb.grid(row=0, column=i, padx=5)
        
        # Tags - Utilities
        tk.Label(form, text="Utilidades:").grid(row=5, column=0, sticky="nw", pady=5)
        util_frame = tk.Frame(form)
        util_frame.grid(row=5, column=1, sticky="w", pady=5)
        self.util_vars = {}
        for i, util in enumerate(UTILITIES):
            var = tk.BooleanVar()
            self.util_vars[util] = var
            cb = tk.Checkbutton(util_frame, text=util, variable=var)
            cb.grid(row=i // 2, column=i % 2, padx=5, sticky="w")
        
        form.columnconfigure(1, weight=1)
        
        # Frame de botones
        buttons_frame = tk.Frame(self.root)
        buttons_frame.pack(pady=20, padx=20, fill="x")
        
        # Botón Importar
        btn_import = tk.Button(
            buttons_frame,
            text="Importar ZIP",
            command=self.import_post,
            bg="#2196F3",
            fg="white",
            font=("Arial", 12, "bold"),
            pady=10,
        )
        btn_import.pack(side="left", expand=True, fill="x", padx=5)
        
        # Botón Exportar
        btn_export = tk.Button(
            buttons_frame,
            text="Exportar ZIP",
            command=self.export_post,
            bg="#FF9800",
            fg="white",
            font=("Arial", 12, "bold"),
            pady=10,
        )
        btn_export.pack(side="left", expand=True, fill="x", padx=5)
        
        # Botón Crear
        btn_create = tk.Button(
            buttons_frame,
            text="Crear Post",
            command=self.create_post,
            bg="#4CAF50",
            fg="white",
            font=("Arial", 12, "bold"),
            pady=10,
        )
        btn_create.pack(side="left", expand=True, fill="x", padx=5)
    
    def select_images(self):
        files = filedialog.askopenfilenames(
            title="Seleccionar imágenes",
            filetypes=[("Imágenes", "*.png *.jpg *.jpeg *.webp"), ("Todos", "*.*")],
        )
        if files:
            self.images.extend(list(files))
            self.update_image_list()
    
    def drop_files(self, event):
        """Maneja el drop de archivos"""
        files = self.root.tk.splitlist(event.data)
        # Filtrar solo imágenes
        valid_images = []
        for f in files:
            # Limpiar rutas (tkinterdnd añade {})
            f = f.strip("{}")
            if Path(f).suffix.lower() in [".png", ".jpg", ".jpeg", ".webp"]:
                valid_images.append(f)
        
        if valid_images:
            self.images.extend(valid_images)
            self.update_image_list()
        else:
            messagebox.showwarning("Advertencia", "No se encontraron imágenes válidas")
    
    def remove_selected_image(self):
        """Elimina la imagen seleccionada de la lista"""
        selection = self.image_listbox.curselection()
        if selection:
            idx = selection[0]
            del self.images[idx]
            self.update_image_list()
    
    def update_image_list(self):
        """Actualiza la lista de imágenes"""
        self.image_listbox.delete(0, tk.END)
        for i, img_path in enumerate(self.images, 1):
            self.image_listbox.insert(tk.END, f"{i}. {Path(img_path).name}")
    
    def clear_images(self):
        """Limpia las imágenes seleccionadas"""
        self.images = []
        self.update_image_list()
    
    def on_closing(self):
        """Limpia el directorio temporal al cerrar"""
        try:
            if self.temp_dir.exists():
                shutil.rmtree(self.temp_dir)
        except Exception:
            pass
        self.root.destroy()
    
    def export_post(self):
        """Exporta el post actual a un archivo ZIP con JSON e imágenes"""
        # Validar
        if not self.images:
            messagebox.showerror("Error", "Debes seleccionar al menos una imagen")
            return
        
        title = self.title_entry.get().strip()
        if not title:
            messagebox.showerror("Error", "Debes ingresar un título")
            return
        
        map_id = self.map_var.get()
        
        # Obtener method components
        method = []
        for component, var in self.method_vars.items():
            if var.get():
                method.append(component)
        
        if not method:
            messagebox.showerror("Error", "Debes seleccionar al menos un componente de método")
            return
        
        # Obtener tags
        tags = []
        for side, var in self.side_vars.items():
            if var.get():
                tags.append(side)
        for site, var in self.site_vars.items():
            if var.get():
                tags.append(site)
        for util, var in self.util_vars.items():
            if var.get():
                tags.append(util)
        
        if not tags:
            messagebox.showerror("Error", "Debes seleccionar al menos un tag")
            return
        
        # Crear JSON con los datos del post
        post_data = {
            "mapId": map_id,
            "title": title,
            "tags": tags,
            "method": method,
            "imageCount": len(self.images),
            "images": [Path(img).name for img in self.images]
        }
        
        # Seleccionar ubicación de guardado
        zip_path = filedialog.asksaveasfilename(
            title="Guardar como",
            defaultextension=".zip",
            filetypes=[("Archivo ZIP", "*.zip")],
            initialfile=f"cs2-post-{title.replace(' ', '-').lower()}.zip"
        )
        
        if not zip_path:
            return
        
        try:
            # Crear ZIP
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # Agregar JSON
                json_data = json.dumps(post_data, indent=2)
                zipf.writestr("post.json", json_data)
                
                # Agregar imágenes
                for i, img_path in enumerate(self.images):
                    ext = Path(img_path).suffix
                    new_name = f"image_{i+1}{ext}"
                    zipf.write(img_path, f"images/{new_name}")
            
            messagebox.showinfo(
                "Éxito",
                f"Post exportado correctamente!\n\nArchivo: {Path(zip_path).name}\nImágenes: {len(self.images)}"
            )
        
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo exportar:\n{str(e)}")
    
    def import_post(self):
        """Importa un post desde un archivo ZIP con JSON e imágenes"""
        # Seleccionar archivo ZIP
        zip_path = filedialog.askopenfilename(
            title="Seleccionar archivo ZIP",
            filetypes=[("Archivo ZIP", "*.zip"), ("Todos", "*.*")]
        )
        
        if not zip_path:
            return
        
        try:
            # Crear directorio temporal
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                
                # Extraer ZIP
                with zipfile.ZipFile(zip_path, 'r') as zipf:
                    zipf.extractall(temp_path)
                
                # Leer JSON
                json_file = temp_path / "post.json"
                if not json_file.exists():
                    messagebox.showerror("Error", "El archivo ZIP no contiene post.json")
                    return
                
                with open(json_file, 'r', encoding='utf-8') as f:
                    post_data = json.load(f)
                
                # Validar estructura del JSON
                required_fields = ["mapId", "title", "tags", "method"]
                for field in required_fields:
                    if field not in post_data:
                        messagebox.showerror("Error", f"El JSON no contiene el campo '{field}'")
                        return
                
                # Buscar carpeta de imágenes
                images_dir = temp_path / "images"
                if not images_dir.exists():
                    messagebox.showerror("Error", "El archivo ZIP no contiene la carpeta 'images'")
                    return
                
                # Obtener lista de imágenes
                image_files = sorted([f for f in images_dir.iterdir() if f.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp']])
                
                if not image_files:
                    messagebox.showerror("Error", "No se encontraron imágenes válidas en el ZIP")
                    return
                
                # Cargar datos en el formulario
                self.title_entry.delete(0, tk.END)
                self.title_entry.insert(0, post_data["title"])
                
                # Seleccionar mapa
                map_id = post_data["mapId"]
                if map_id in MAPS:
                    self.map_combo.set(map_id)
                
                # Resetear todos los checkboxes
                for var in self.side_vars.values():
                    var.set(False)
                for var in self.site_vars.values():
                    var.set(False)
                for var in self.util_vars.values():
                    var.set(False)
                for var in self.method_vars.values():
                    var.set(False)
                
                # Marcar tags
                for tag in post_data["tags"]:
                    if tag in self.side_vars:
                        self.side_vars[tag].set(True)
                    elif tag in self.site_vars:
                        self.site_vars[tag].set(True)
                    elif tag in self.util_vars:
                        self.util_vars[tag].set(True)
                
                # Marcar métodos
                for method in post_data["method"]:
                    if method in self.method_vars:
                        self.method_vars[method].set(True)
                
                # Copiar imágenes al directorio temporal persistente
                persistent_images = []
                for img in image_files:
                    dest = self.temp_dir / img.name
                    shutil.copy2(img, dest)
                    persistent_images.append(str(dest))
                
                # Cargar imágenes
                self.images = persistent_images
                self.update_image_list()
                
                messagebox.showinfo(
                    "Éxito",
                    f"Post importado correctamente!\n\nTítulo: {post_data['title']}\nImágenes: {len(image_files)}\n\nAhora puedes crear el post o modificarlo."
                )
        
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo importar:\n{str(e)}")
    
    def create_post(self):
        # Validar
        if not self.images:
            messagebox.showerror("Error", "Debes seleccionar al menos una imagen")
            return
        
        title = self.title_entry.get().strip()
        if not title:
            messagebox.showerror("Error", "Debes ingresar un título")
            return
        
        map_id = self.map_var.get()
        
        # Obtener method components
        method = []
        for component, var in self.method_vars.items():
            if var.get():
                method.append(component)
        
        if not method:
            messagebox.showerror("Error", "Debes seleccionar al menos un componente de método")
            return
        
        # Obtener tags
        tags = []
        for side, var in self.side_vars.items():
            if var.get():
                tags.append(side)
        for site, var in self.site_vars.items():
            if var.get():
                tags.append(site)
        for util, var in self.util_vars.items():
            if var.get():
                tags.append(util)
        
        if not tags:
            messagebox.showerror("Error", "Debes seleccionar al menos un tag")
            return
        
        # Generar nombre base para las imágenes
        sanitized_title = re.sub(r'[^\w\s-]', '', title.lower())
        sanitized_title = re.sub(r'[\s]+', '-', sanitized_title.strip())
        
        # Agregar tags importantes (side y utility)
        name_parts = [sanitized_title]
        for side, var in self.side_vars.items():
            if var.get():
                name_parts.append(side.lower())
        for util, var in self.util_vars.items():
            if var.get():
                name_parts.append(util.lower())
        
        base_name = "-".join(name_parts)
        
        # Generar ID único
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        post_id = f"{map_id}-{timestamp}"
        
        # Nombre del mapa sin "de_"
        map_name = map_id.replace("de_", "")
        
        # Copiar imágenes
        map_images_dir = IMAGES_DIR / map_name
        map_images_dir.mkdir(parents=True, exist_ok=True)
        
        image_paths = []
        for i, img_path in enumerate(self.images):
            ext = Path(img_path).suffix
            new_name = f"{base_name}-{i+1}{ext}"
            dest = map_images_dir / new_name
            shutil.copy2(img_path, dest)
            image_paths.append(f"{map_name}/{new_name}")
        
        # Crear entrada de post
        tags_str = ", ".join([f"'{t}'" for t in tags])
        images_str = ", ".join([f"'{p}'" for p in image_paths])
        method_str = ", ".join([f"'{m}'" for m in method])
        
        post_entry = f"""  {{
    id: '{post_id}',
    mapId: '{map_id}',
    title: '{title}',
    images: [{images_str}],
    tags: [{tags_str}],
    method: [{method_str}],
  }},"""
        
        # Actualizar archivo TypeScript
        ts_file = POSTS_DIR / f"{map_name}.ts"
        
        try:
            with open(ts_file, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Buscar el patrón de array vacío: = []
            if "= []" in content:
                # Convertir array vacío a array con contenido
                post_lines = post_entry.split('\n')
                new_content = post_lines[0]  # Primera línea del post sin \n
                for line in post_lines[1:]:
                    new_content += '\n' + line
                
                # Reemplazar = [] con = [post, ]
                content = content.replace("= []", f"= [\n{post_entry}\n]")
            else:
                # Array ya tiene contenido, insertar antes del cierre
                # Buscar el patrón ]$ (cierre del array al final)
                lines = content.split('\n')
                
                insert_idx = -1
                for i in range(len(lines) - 1, -1, -1):
                    if lines[i].strip() == ']':
                        insert_idx = i
                        break
                
                if insert_idx == -1:
                    messagebox.showerror("Error", f"No se pudo encontrar el cierre del array en {ts_file}")
                    return
                
                # Insertar el nuevo post antes del cierre
                lines.insert(insert_idx, post_entry)
                content = '\n'.join(lines)
            
            with open(ts_file, "w", encoding="utf-8") as f:
                f.write(content)
            
            messagebox.showinfo(
                "Éxito",
                f"Post creado correctamente!\n\nID: {post_id}\nImágenes: {len(image_paths)}\nNombre: {base_name}",
            )
            
            # Resetear form
            self.title_entry.delete(0, tk.END)
            self.images = []
            self.update_image_list()
            for var in self.side_vars.values():
                var.set(False)
            for var in self.site_vars.values():
                var.set(False)
            for var in self.util_vars.values():
                var.set(False)
            for var in self.method_vars.values():
                var.set(False)
        
        except Exception as e:
            messagebox.showerror("Error", f"No se pudo actualizar el archivo:\n{str(e)}")


def main():
    root = TkinterDnD.Tk()
    app = PostCreatorApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
