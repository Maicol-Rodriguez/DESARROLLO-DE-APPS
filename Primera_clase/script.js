let productos = [];


// AGREGAR PRODUCTO

function agregarProducto() {

    let nombre =
        document.getElementById("producto").value;

    let cantidad =
        Number(document.getElementById("cantidad").value);

    let precio =
        Number(document.getElementById("precio").value);


    if (nombre === "" || cantidad <= 0 || precio <= 0) {

        alert("Complete todos los campos correctamente");

        return;
    }


    let nuevoProducto = {

        nombre: nombre,

        cantidad: cantidad,

        precio: precio

    };


    productos.push(nuevoProducto);


    mostrarProductos();


    // LIMPIAR CAMPOS

    document.getElementById("producto").value = "";

    document.getElementById("cantidad").value = "";

    document.getElementById("precio").value = "";
}



// MOSTRAR PRODUCTOS

function mostrarProductos() {

    let lista =
        document.getElementById("listaProductos");


    lista.innerHTML = "";


    let total = 0;


    productos.forEach((producto, indice) => {


        let subtotal =
            producto.cantidad * producto.precio;


        total += subtotal;


        let fila =
            document.createElement("div");


        fila.classList.add("producto");


        fila.innerHTML = `

            <span>
                ${producto.nombre}
            </span>


            <input
                type="number"
                value="${producto.cantidad}"
                min="1"
                onchange="editarCantidad(${indice}, this.value)"
            >


            <input
                type="number"
                value="${producto.precio}"
                min="1"
                onchange="editarPrecio(${indice}, this.value)"
            >


            <span>
                $${subtotal.toLocaleString("es-CO")}
            </span>


            <button
                class="boton-eliminar"
                onclick="eliminarProducto(${indice})"
            >
                🗑️
            </button>

        `;


        lista.appendChild(fila);

    });


    document.getElementById("total").textContent =
        total.toLocaleString("es-CO");
}



// EDITAR CANTIDAD

function editarCantidad(indice, nuevaCantidad) {

    productos[indice].cantidad =
        Number(nuevaCantidad);


    mostrarProductos();
}



// EDITAR PRECIO

function editarPrecio(indice, nuevoPrecio) {

    productos[indice].precio =
        Number(nuevoPrecio);


    mostrarProductos();
}



// ELIMINAR

function eliminarProducto(indice) {

    productos.splice(indice, 1);

    mostrarProductos();
}



// GENERAR FACTURA

function generarFactura() {

    if (productos.length === 0) {

        alert("No hay productos para generar la factura");

        return;
    }


    let factura =
        document.getElementById("productosFactura");


    factura.innerHTML = "";


    let total = 0;


    productos.forEach((producto) => {


        let subtotal =
            producto.cantidad * producto.precio;


        total += subtotal;


        let fila =
            document.createElement("div");


        fila.classList.add("fila-factura");


        fila.innerHTML = `

            <div>
                <strong>
                    ${producto.nombre}
                </strong>
            </div>


            <div>
                ${producto.cantidad}
                x
                $${producto.precio.toLocaleString("es-CO")}
            </div>


            <div>
                $${subtotal.toLocaleString("es-CO")}
            </div>

        `;


        factura.appendChild(fila);

    });


    document.getElementById("totalFactura").textContent =
        total.toLocaleString("es-CO");


    document.getElementById("factura").style.display =
        "flex";
}



// CERRAR FACTURA

function cerrarFactura() {

    document.getElementById("factura").style.display =
        "none";
}