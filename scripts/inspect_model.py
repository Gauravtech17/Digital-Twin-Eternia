import struct
import json

def mat_mul_vec(m, v):
    # m is 16 elements (column-major)
    # [m0, m1, m2, m3,
    #  m4, m5, m6, m7,
    #  m8, m9, m10,m11,
    #  m12,m13,m14,m15]
    x, y, z = v
    rx = m[0]*x + m[4]*y + m[8]*z + m[12]
    ry = m[1]*x + m[5]*y + m[9]*z + m[13]
    rz = m[2]*x + m[6]*y + m[10]*z + m[14]
    rw = m[3]*x + m[7]*y + m[11]*z + m[15]
    if rw != 0 and rw != 1:
        rx /= rw
        ry /= rw
        rz /= rw
    return (rx, ry, rz)

def mat_mul_mat(a, b):
    # Both a and b are 16-element column-major matrices (glTF standard)
    res = [0.0] * 16
    for col in range(4):
        for row in range(4):
            val = 0.0
            for k in range(4):
                val += a[k * 4 + row] * b[col * 4 + k]
            res[col * 4 + row] = val
    return res

def inspect_transformed():
    with open(r'c:\Users\admin\Downloads\uterus.glb', 'rb') as f:
        f.seek(12)
        clen, ctype = struct.unpack('<I4s', f.read(8))
        d = json.loads(f.read(clen))
        f.seek(20 + clen)
        b_len, b_type = struct.unpack('<I4s', f.read(8))
        bin_data = f.read(b_len)

    acc_idx = d['meshes'][0]['primitives'][0]['attributes']['POSITION']
    acc = d['accessors'][acc_idx]
    bv = d['bufferViews'][acc['bufferView']]
    offset = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
    count = acc['count']

    nodes = d['nodes']
    # Build chain: 0 -> 1 -> 2 -> 3 -> 4 -> 5
    world_m = [
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        0,0,0,1
    ]
    for idx in range(len(nodes)):
        n = nodes[idx]
        if 'matrix' in n and n['matrix']:
            world_m = mat_mul_mat(world_m, n['matrix'])

    print("Computed World Matrix:")
    for r in range(4):
        print([world_m[c*4 + r] for c in range(4)])

    min_x = min_y = min_z = float('inf')
    max_x = max_y = max_z = float('-inf')

    # Read first 1000 vertices and all vertices for bounds
    for i in range(count):
        vx, vy, vz = struct.unpack_from('<3f', bin_data, offset + i*12)
        tx, ty, tz = mat_mul_vec(world_m, (vx, vy, vz))
        min_x = min(min_x, tx)
        min_y = min(min_y, ty)
        min_z = min(min_z, tz)
        max_x = max(max_x, tx)
        max_y = max(max_y, ty)
        max_z = max(max_z, tz)

    print(f"Transformed World Bounds: min=[{min_x:.4f}, {min_y:.4f}, {min_z:.4f}], max=[{max_x:.4f}, {max_y:.4f}, {max_z:.4f}]")
    print(f"Dimensions: X={max_x - min_x:.4f}, Y={max_y - min_y:.4f}, Z={max_z - min_z:.4f}")
    center = [(min_x + max_x)/2, (min_y + max_y)/2, (min_z + max_z)/2]
    print(f"Center: [{center[0]:.4f}, {center[1]:.4f}, {center[2]:.4f}]")

if __name__ == '__main__':
    inspect_transformed()
