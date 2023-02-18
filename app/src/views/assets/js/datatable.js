const dtConfig = {
    columnDefs: [ 
        {
            defaultContent: "-",
            targets: "_all",
        }, 
        {
            targets: -1,
            render: function (data, type, row, meta) {
                return `<div>
                        <button class="btn btn-secondary btn-block" onclick=viewFromID(${meta.row})>
                            <i class="fa fa-search"></i>
                        </button>

                        <button class="btn btn-danger" onclick=delFromID("${row._id}")>
                            <i class="fa fa-trash-o"></i>
                        </button>
                    </div>
                `;
            }
        }
    ],
    responsive: true,
    processing: true,
    serverSide: true,
    ordering: false,
    ajax: {
        type: "GET",
        url: null,
        dataSrc: 'data'
    },
    columns: null
};

// Create datatable
function getDT(getFieldsUrl, getDataUrl) {
    let columns = [];
    $.ajax({
        url: getFieldsUrl,
        success: function (data) {
            for (const colName of data){
                columns.push({
                    title: colName,
                    data: colName, 
                    name: colName,
                });

                $("#select").append(`<option value="${colName}">${colName}</option>`);
            } 

            // Actions column
            columns.push({
                title: null,
                data: null, 
                name: null,
                className: "all"
            });

            dtConfig.columns = columns;
            dtConfig.ajax.url = getDataUrl;
            $('#table').DataTable(dtConfig);
        }
    });
}

// Initialize search box
function initSearchBox() {
    $("#input-select").val("");
    $("#input-select").on('keyup', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            $("#table").DataTable().columns().search("");
            const colName = $("#select").val();
            const val = this.value;
            const column = $("#table").DataTable().column(`${colName}:name`);
            column.search(val).draw();
        }
    });
}

// Set modal data (title + body)
function setModalData(title, body) {
    const modal = document.getElementById('modal');
    const modalTitle = modal.querySelector('.modal-title');
    const modalBody = modal.querySelector('.modal-body');
    modalTitle.textContent = title;
    modalBody.innerHTML = body;
}

// Open deletion modal
function openDeleteModal() {
    $("#modal-confirm-btn").addClass("btn-danger").removeClass("btn-primary");
    $("#modal-confirm-btn").text("Eliminar");
    $("#modal").modal('show');
}

// View item popup modal
function viewFromID(rowIndex) {
    $("#modal-confirm-btn").hide()
    const data = $("#table").DataTable().row(rowIndex).data();
    const title = `Item: ${data._id}`;
    const body = `<pre>${JSON.stringify(data, undefined, 2)}</pre>`;
    setModalData(title, body);
    $("#modal").modal('show');
}

// Delete all popup modal
function delAll() {
    const title = `Eliminar tudo`;
    const body = `Tem a certeza que pretende eliminar todos os itens?`;
    setModalData(title, body);
    $("#modal-confirm-btn").on("click", function(){ $("#formDeleteAll").submit() });
}

// Delete item popup modal
async function delFromID(id) {
    const title = `Eliminar item`;
    const body = `Tem a certeza que pretende eliminar o item <strong>${id}</strong>?`;
    setModalData(title, body);
    $("#modal-confirm-btn").show();
    openDeleteModal();
    $("#modal-confirm-btn").on("click", function(){ deleteItem(id); });
}

// Http request to delete item
async function deleteItem(id) {
    $.post(`/api/region/${id}/delete`, function(data, status){
        $('#table').DataTable().ajax.reload();
        showSuccessAlert("Item eliminado com sucesso!");
    }).fail(e => {
        showErrorAlert(e);
    });
    $("#modal").modal('hide');
}