// ================================================================
// LAYOUTS DEL CONECTOR - [campo, tamaño, tipo A|N|D]
// Transcritos de propartes-siesa-sync (class-pss-order-builder.php y
// class-pss-tercero-builder.php), que salen de las especificaciones .xls de TI/U2.
// LARGOS fija la longitud de cada registro; lo verifica pruebas/plano.test.js.
// ================================================================

const L430 = [
    ['F_NUMERO-REG', 7, 'N'], ['F_TIPO-REG', 4, 'N'], ['F_SUBTIPO_REG', 2, 'N'],
    ['F_VERSION-REG', 2, 'N'], ['F_CIA', 3, 'N'], ['F_LIQUIDA_IMPUESTO', 1, 'N'],
    ['F_CONSEC_AUTO_REG', 1, 'N'], ['F_IND_CONTACTO', 1, 'N'], ['f430_id_co', 3, 'A'],
    ['f430_id_tipo_docto', 3, 'A'], ['f430_consec_docto', 8, 'N'], ['f430_id_fecha', 8, 'A'],
    ['f430_id_clase_docto', 3, 'N'], ['f430_ind_estado', 1, 'N'], ['f430_ind_backorder', 1, 'N'],
    ['f430_id_tercero_fact', 15, 'A'], ['f430_id_sucursal_fact', 3, 'A'], ['f430_id_tercero_rem', 15, 'A'],
    ['f430_id_sucursal_rem', 3, 'A'], ['f430_id_tipo_cli_fact', 4, 'A'], ['f430_id_co_fact', 3, 'A'],
    ['f430_fecha_entrega', 8, 'A'], ['f430_num_dias_entrega', 3, 'N'], ['f430_num_docto_referencia', 15, 'A'],
    ['f430_referencia', 10, 'A'], ['f430_id_cargue', 10, 'A'], ['f430_id_moneda_docto', 3, 'A'],
    ['f430_id_moneda_conv', 3, 'A'], ['f430_tasa_conv', 13, 'D'], ['f430_id_moneda_local', 3, 'A'],
    ['f430_tasa_local', 13, 'D'], ['f430_id_cond_pago', 3, 'A'], ['f430_ind_impresion', 1, 'N'],
    ['f430_notas', 2000, 'A'], ['f430_id_cli_contado', 15, 'A'], ['f430_id_punto_envio', 3, 'A'],
    ['f430_id_tercero_vendedor', 15, 'A'], ['f419_contacto', 50, 'A'], ['f419_direccion1', 40, 'A'],
    ['f419_direccion2', 40, 'A'], ['f419_direccion3', 40, 'A'], ['f419_id_pais', 3, 'A'],
    ['f419_id_depto', 2, 'A'], ['f419_id_ciudad', 3, 'A'], ['f419_id_barrio', 40, 'A'],
    ['f419_telefono', 20, 'A'], ['f419_fax', 20, 'A'], ['f419_cod_postal', 10, 'A'],
    ['f419_email', 50, 'A'], ['f419_ind_descuento', 1, 'N'], ['f430_tasa_dscto_global_cap', 8, 'D'],
    ['f430_id_un_suc', 20, 'A'],
];

const L431 = [
    ['F_NUMERO-REG', 7, 'N'], ['F_TIPO-REG', 4, 'N'], ['F_SUBTIPO-REG', 2, 'N'],
    ['F_VERSION-REG', 2, 'N'], ['F_CIA', 3, 'N'], ['f431_id_co', 3, 'A'],
    ['f431_id_tipo_docto', 3, 'A'], ['f431_consec_docto', 8, 'N'], ['f431_nro_registro', 10, 'N'],
    ['f431_id_item', 7, 'N'], ['f431_referencia_item', 50, 'A'], ['f431_codigo_barras', 20, 'A'],
    ['f431_id_ext1_detalle', 20, 'A'], ['f431_id_ext2_detalle', 20, 'A'], ['f431_id_bodega', 5, 'A'],
    ['f431_id_concepto', 3, 'N'], ['f431_id_motivo', 2, 'A'], ['f431_ind_obsequio', 1, 'N'],
    ['f431_id_co_movto', 3, 'A'], ['f431_id_un_movto', 20, 'A'], ['f431_id_ccosto_movto', 15, 'A'],
    ['f431_id_proyecto', 15, 'A'], ['f431_fecha_entrega', 8, 'A'], ['f431_num_dias_entrega', 3, 'N'],
    ['f431_id_lista_precio', 3, 'A'], ['f431_id_unidad_medida', 4, 'A'], ['f431_cant_pedida_base', 20, 'D'],
    ['f431_cant2_pedida', 20, 'D'], ['f431_precio_unitario', 20, 'D'], ['f431_ind_impto_asumido', 1, 'N'],
    ['f431_notas', 255, 'A'], ['f431_detalle', 2000, 'A'], ['f431_ind_backorder', 1, 'N'],
    ['f431_ind_precio', 1, 'N'], ['f431_id_punto_envio', 3, 'A'],
];

const L432 = [
    ['F_NUMERO-REG', 7, 'N'], ['F_TIPO-REG', 4, 'N'], ['F_SUBTIPO-REG', 2, 'N'],
    ['F_VERSION-REG', 2, 'N'], ['F_CIA', 3, 'N'], ['F430_ID_CO', 3, 'A'],
    ['F430_ID_TIPO_DOCTO', 3, 'A'], ['F430_CONSEC_DOCTO', 8, 'N'], ['F431_NRO_REGISTRO', 10, 'N'],
    ['F433_ID_LLAVE_IMPUESTO', 4, 'A'], ['F433_PORCENTAJE_BASE', 8, 'D'], ['F433_TASA', 8, 'D'],
    ['F433_VLR_UNI', 20, 'D'], ['F433_IND_DESCONTABLE', 1, 'N'], ['F433_IND_ACCION', 1, 'N'],
    ['F433_IND_CALCULO', 1, 'N'], ['F433_ID_LLAVE_IMPUESTO_DESC', 4, 'A'], ['F433_PORCENTAJE_BASE_DESC', 8, 'D'],
    ['F433_TASA_DESC', 8, 'D'], ['F433_PORC_IMP_VALOR_DESC', 8, 'D'],
];

const L200 = [
    ['F_NUMERO_REG', 7, 'N'], ['F_TIPO_REG', 4, 'N'], ['F_SUBTIPO_REG', 2, 'N'],
    ['F_VERSION_REG', 2, 'N'], ['F_CIA', 3, 'N'], ['F_ACTUALIZA_REG', 1, 'N'],
    ['F200_ID', 15, 'A'], ['F200_NIT', 25, 'A'], ['F200_DV_NIT', 3, 'A'],
    ['F200_ID_TIPO_IDENT', 1, 'A'], ['F200_IND_TIPO_TERCERO', 1, 'N'], ['F200_RAZON_SOCIAL', 100, 'A'],
    ['F200_APELLIDO1', 29, 'A'], ['F200_APELLIDO2', 29, 'A'], ['F200_NOMBRES', 40, 'A'],
    ['F200_NOMBRE_EST', 50, 'A'], ['F200_IND_CLIENTE', 1, 'N'], ['F200_IND_PROVEEDOR', 1, 'N'],
    ['F200_IND_EMPLEADO', 1, 'N'], ['F200_IND_ACCIONISTA', 1, 'N'], ['F200_IND_OTROS', 1, 'N'],
    ['F200_IND_INTERNO', 1, 'N'], ['F015_CONTACTO', 50, 'A'], ['F015_DIRECCION1', 40, 'A'],
    ['F015_DIRECCION2', 40, 'A'], ['F015_DIRECCION3', 40, 'A'], ['F015_ID_PAIS', 3, 'A'],
    ['F015_ID_DEPTO', 2, 'A'], ['F015_ID_CIUDAD', 3, 'A'], ['F015_ID_BARRIO', 40, 'A'],
    ['F015_TELEFONO', 20, 'A'], ['F015_FAX', 20, 'A'], ['F015_COD_POSTAL', 10, 'A'],
    ['F015_EMAIL', 255, 'A'], ['F200_FECHA_NACIMIENTO', 8, 'A'], ['F200_ID_CIIU', 4, 'A'],
    ['F200_IND_NO_DOMICILIADO', 1, 'A'], ['F200_IND_ESTADO', 1, 'A'], ['F015_CELULAR', 50, 'A'],
];

const L201 = [
    ['F_NUMERO_REG', 7, 'N'], ['F_TIPO_REG', 4, 'N'], ['F_SUBTIPO_REG', 2, 'N'],
    ['F_VERSION_REG', 2, 'N'], ['F_CIA', 3, 'N'], ['F_ACTUALIZA_REG', 1, 'N'],
    ['F201_ID_TERCERO', 15, 'A'], ['F201_ID_SUCURSAL', 3, 'A'], ['F201_IND_ESTADO_ACTIVO', 1, 'N'],
    ['F201_DESCRIPCION_SUCURSAL', 40, 'A'], ['F201_ID_MONEDA', 3, 'A'], ['F201_ID_VENDEDOR', 4, 'A'],
    ['F201_IND_CALIFICACION', 1, 'A'], ['F201_ID_COND_PAGO', 3, 'A'], ['F201_DIAS_GRACIA', 3, 'N'],
    ['F201_CUPO_CREDITO', 21, 'N'], ['F201_ID_CLIENTE_CORP', 15, 'A'], ['F201_ID_SUCURSAL_CORP', 3, 'A'],
    ['F201_ID_TIPO_CLI', 4, 'A'], ['F201_ID_GRUPO_DSCTO', 4, 'A'], ['F201_ID_LISTA_PRECIO', 3, 'A'],
    ['F201_IND_PEDIDO_BACKORDER', 1, 'N'], ['F201_PORC_EXCESO_VENTA', 7, 'N'], ['F201_PORC_MIN_MARGEN', 7, 'N'],
    ['F201_PORC_MAX_MARGEN', 7, 'N'], ['F201_IND_BLOQUEADO', 1, 'N'], ['F201_IND_BLOQUEO_CUPO', 1, 'N'],
    ['F201_IND_BLOQUEO_MORA', 1, 'N'], ['F201_IND_FACTURA_UNIFICADA', 1, 'N'], ['F201_ID_CO_FACTURA', 3, 'A'],
    ['F201_NOTAS', 255, 'A'], ['F015_CONTACTO', 50, 'A'], ['F015_DIRECCION1', 40, 'A'],
    ['F015_DIRECCION2', 40, 'A'], ['F015_DIRECCION3', 40, 'A'], ['F015_ID_PAIS', 3, 'A'],
    ['F015_ID_DEPTO', 2, 'A'], ['F015_ID_CIUDAD', 3, 'A'], ['F015_ID_BARRIO', 40, 'A'],
    ['F015_TELEFONO', 20, 'A'], ['F015_FAX', 20, 'A'], ['F015_COD_POSTAL', 10, 'A'],
    ['F015_EMAIL', 255, 'A'], ['F201_FECHA_INGRESO', 8, 'A'], ['F201_ID_CO_MOVTO_FACTURA', 3, 'A'],
    ['F201_ID_UN_MOVTO_FACTURA', 20, 'A'], ['F201_ID_PARAMETRO_EDI', 4, 'A'], ['F201_CODIGO_EAN', 35, 'A'],
    ['f201_fecha_cupo', 8, 'A'], ['f201_porc_tolerancia', 7, 'N'], ['f201_dia_maximo_factura', 2, 'N'],
    ['f201_id_motivo_bloqueo', 3, 'A'], ['f201_id_cobrador', 4, 'A'], ['f201_ind_compromiso_um_emp', 1, 'N'],
    ['f201_ind_anticipo_terc_corp', 1, 'N'], ['f015_celular', 50, 'A'],
];

const L207 = [
    ['F_NUMERO_REG', 7, 'N'], ['F_TIPO_REG', 4, 'N'], ['F_SUBTIPO_REG', 2, 'N'],
    ['F_VERSION_REG', 2, 'N'], ['F_CIA', 3, 'N'], ['F_ACTUALIZA_REG', 1, 'N'],
    ['F207_ID_TERCERO', 15, 'A'], ['F207_ID_SUCURSAL', 3, 'A'], ['F207_ID_PLAN_CRITERIOS', 3, 'A'],
    ['F207_ID_CRITERIO_MAYOR', 10, 'A'],
];

const L046 = [
    ['F_NUMERO_REG', 7, 'N'], ['F_TIPO_REG', 4, 'N'], ['F_SUBTIPO_REG', 2, 'N'],
    ['F_VERSION_REG', 2, 'N'], ['F_CIA', 3, 'N'], ['F_ACTUALIZA_REG', 1, 'N'],
    ['F_ID_TERCERO', 15, 'A'], ['F_ID_SUCURSAL', 3, 'A'], ['F_ID_CLASE', 3, 'A'],
    ['F_ID_VALOR_TERCERO', 2, 'A'], ['F_ID_LLAVE', 4, 'A'],
];

// 0046 (impuesto) y 0047 (retención) comparten layout.
const LARGOS = { '0430': 2556, '0431': 2562, '0432': 113, '0200': 905, '0201': 1095, '0207': 50, '0046': 46, '0047': 46, '0000': 18, '9999': 18 };

module.exports = { L430, L431, L432, L200, L201, L207, L046, LARGOS };
