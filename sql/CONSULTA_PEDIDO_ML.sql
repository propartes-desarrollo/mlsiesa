PROPARTES,CONSULTA_PEDIDO_ML
<xsd:element minOccurs="1" maxOccurs="1" name="referencia" type="xsd:string" />
/#
-- Pedido de venta que creo mlsiesa para una venta de Mercado Libre, con sus lineas.
-- @referencia: f430_num_docto_referencia = los 15 ultimos digitos del # de venta de ML.
-- Una fila por linea; los datos del encabezado se repiten. Solo lectura.
-- La app lee las columnas por su ALIAS: si hay que ajustar nombres de tablas o
-- columnas, conservar los alias.
SELECT
    LTRIM(RTRIM(pv.f430_id_co))                AS co,
    LTRIM(RTRIM(pv.f430_id_tipo_docto))        AS tipo_docto,
    pv.f430_consec_docto                       AS consec,
    CONVERT(varchar(10), pv.f430_id_fecha, 23) AS fecha,
    pv.f430_ind_estado                         AS estado,
    LTRIM(RTRIM(pv.f430_num_docto_referencia)) AS referencia,
    LTRIM(RTRIM(ter.f200_id))                  AS tercero,
    LTRIM(RTRIM(ter.f200_nombre_est))          AS tercero_nombre,
    LTRIM(RTRIM(pv.f430_notas))                AS notas,
    mv.f431_rowid                              AS linea_rowid,
    LTRIM(RTRIM(it.f120_referencia))           AS item,
    LTRIM(RTRIM(it.f120_descripcion))          AS descripcion,
    LTRIM(RTRIM(bod.f150_id))                  AS bodega,
    CAST(mv.f431_cant_pedida_base AS numeric(18,4)) AS cantidad,
    CAST(mv.f431_precio_unitario_base AS numeric(18,4)) AS precio_unitario,
    CAST(mv.f431_vlr_bruto AS numeric(18,2))   AS vlr_bruto,
    CAST(mv.f431_vlr_imp AS numeric(18,2))     AS vlr_imp,
    CAST(mv.f431_vlr_neto AS numeric(18,2))    AS vlr_neto
FROM t430_cm_pv_docto pv
INNER JOIN t200_mm_terceros ter      ON ter.f200_rowid = pv.f430_rowid_tercero_fact
LEFT JOIN  t431_cm_pv_movto mv       ON mv.f431_rowid_pv_docto = pv.f430_rowid
LEFT JOIN  t121_mc_items_extensiones ext ON ext.f121_rowid = mv.f431_rowid_item_ext
LEFT JOIN  t120_mc_items it          ON it.f120_rowid = ext.f121_rowid_item
LEFT JOIN  t150_mc_bodegas bod       ON bod.f150_rowid = mv.f431_rowid_bodega
WHERE pv.f430_id_tipo_docto = 'PML'
  AND LTRIM(RTRIM(pv.f430_num_docto_referencia)) = LTRIM(RTRIM(@referencia))
ORDER BY pv.f430_consec_docto, mv.f431_rowid
